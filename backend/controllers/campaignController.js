// backend/controllers/campaignController.js
import Campaign from '../models/Campaign.js';
import uploadToS3 from '../utils/uploadToS3.js';
import { ethers } from 'ethers';
import FundChainXABI from '../artifacts/contracts/FundChainX.sol/FundChainX.json' with {type:"json"};
import CampaignABI from '../artifacts/contracts/FundChainX.sol/Campaign.json' with {type:"json"};
import User from '../models/User.js';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x74F80bE31FD2736d27f79B485f694583681bCd46";
const RPC_URL = process.env.RPC_URL || "https://sepolia.infura.io/v3/173a86041e634007924433b2cc66a6da";
const provider = new ethers.JsonRpcProvider(RPC_URL);
const fundChainXContract = new ethers.Contract(CONTRACT_ADDRESS, FundChainXABI.abi, provider);

const getCampaignContract = (address) => new ethers.Contract(address, CampaignABI.abi, provider);

const CampaignState = {
  0: 'ACTIVE',
  1: 'SUCCESS',
  2: 'EXPIRED',
  3: 'ABORTED',
  4: 'WITHDRAWN',
  5: 'FAILED',
};

export const getAllCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc', status, category } = req.query;

    const query = {};
    if (status) query.status = status.toUpperCase();
    if (category) query.category = category;

    const sortOptions = { [sort]: order === 'desc' ? -1 : 1 };

    const campaigns = await Campaign.find(query)
      .sort(sortOptions)
      .limit(Number(limit))
      .skip((page - 1) * limit);

    const total = await Campaign.countDocuments(query);

    const updatedCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        if (campaign.contractAddress) {
          const contract = getCampaignContract(campaign.contractAddress);
          const summary = await contract.getCampaignSummary();
          return {
            ...campaign._doc,
            raisedAmount: ethers.formatEther(summary.currentAmount),
            contributorsCount: Number(summary.numBackers),
            status: CampaignState[Number(summary.currentState)] || 'ACTIVE',
          };
        }
        return campaign;
      })
    );

    res.json({
      campaigns: updatedCampaigns,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      totalCampaigns: total,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
  }
};

export const getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    if (campaign.contractAddress) {
      const contract = getCampaignContract(campaign.contractAddress);
      const details = await contract.getCampaignDetails();
      campaign.raisedAmount = ethers.formatEther(details._raisedAmount);
      campaign.contributorsCount = Number(details._contributorsCount);
      campaign.status = CampaignState[Number(details._state)] || 'ACTIVE';
      campaign.totalRefunded = ethers.formatEther(details._totalRefunded);
      campaign.refundPeriodEnd = Number(details._refundPeriodEnd);
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaign', error: error.message });
  }
};

export const getCampaignByAddress = async (req, res) => {
  try {
    const { address } = req.params;
    const campaign = await Campaign.findOne({ contractAddress: address });

    if (!campaign) return res.status(404).json({ message: 'No campaign found with this contract address', address });

    const contract = getCampaignContract(address);
    const details = await contract.getCampaignDetails();
    campaign.raisedAmount = ethers.formatEther(details._raisedAmount);
    campaign.targetContribution = ethers.formatEther(details._targetContribution);
    campaign.minimumContribution = ethers.formatEther(details._minimumContribution);
    campaign.deadline = new Date(Number(details._deadline) * 1000);
    campaign.contributorsCount = Number(details._contributorsCount);
    campaign.status = CampaignState[Number(details._state)] || 'ACTIVE';
    campaign.totalRefunded = ethers.formatEther(details._totalRefunded);
    campaign.refundPeriodEnd = Number(details._refundPeriodEnd);

    await campaign.save();
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaign', error: error.message });
  }
};

export const getCampaignsByCreator = async (req, res) => {
  try {
    const { creatorAddress } = req.params;
    const campaigns = await Campaign.find({ creator: creatorAddress.toLowerCase() });

    const updatedCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        if (campaign.contractAddress) {
          const contract = getCampaignContract(campaign.contractAddress);
          const summary = await contract.getCampaignSummary();
          return {
            ...campaign._doc,
            raisedAmount: ethers.formatEther(summary.currentAmount),
            contributorsCount: Number(summary.numBackers),
            status: CampaignState[Number(summary.currentState)] || 'ACTIVE',
          };
        }
        return campaign;
      })
    );

    res.json(updatedCampaigns);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching creator campaigns', error: error.message });
  }
};

export const createCampaign = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });

    const user = await User.findById(req.user.userId);
    if (!user.walletAddress) return res.status(403).json({ message: 'Please link your wallet first' });

    const { title, description, contractAddress, minimumContribution, targetContribution, deadline, category, status } = req.body;

    let bannerUrl = null;
    if (req.file) {
      bannerUrl = await uploadToS3(req.file);
    } else if (req.body.bannerUrl) {
      bannerUrl = req.body.bannerUrl;
    }

    if (!title || !description || !contractAddress || !category) {
      return res.status(400).json({ message: 'Missing required campaign fields' });
    }

    const contract = getCampaignContract(contractAddress);
    const details = await contract.getCampaignDetails();

    if (details._creator.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({ message: 'Only the campaign creator can register this campaign' });
    }

    let statusValue = status || CampaignState[Number(details._state)] || 'ACTIVE';
    if (!['ACTIVE', 'SUCCESS', 'EXPIRED', 'ABORTED', 'WITHDRAWN', 'FAILED'].includes(statusValue)) {
      statusValue = 'ACTIVE';
    }

    const newCampaign = new Campaign({
      title,
      description,
      creator: user.walletAddress.toLowerCase(),
      contractAddress,
      minimumContribution: Number(minimumContribution) || Number(ethers.formatEther(details._minimumContribution)),
      targetContribution: Number(targetContribution) || Number(ethers.formatEther(details._targetContribution)),
      deadline: deadline ? new Date(deadline) : new Date(Number(details._deadline) * 1000),
      bannerUrl,
      status: statusValue,
      category,
      raisedAmount: ethers.formatEther(details._raisedAmount),
      contributorsCount: Number(details._contributorsCount),
      totalRefunded: ethers.formatEther(details._totalRefunded),
      refundPeriodEnd: Number(details._refundPeriodEnd),
    });

    const savedCampaign = await newCampaign.save();
    res.status(201).json({ message: 'Campaign created successfully', campaign: savedCampaign });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create campaign', error: error.message });
  }
};

export const updateCampaign = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });

    const user = await User.findById(req.user.userId);
    if (!user.walletAddress) return res.status(403).json({ message: 'Please link your wallet first' });

    const { id } = req.params;
    const campaign = await Campaign.findById(id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    if (campaign.creator.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({ message: 'Only the creator can update this campaign' });
    }

    const updateData = req.body;
    if (req.file) updateData.bannerUrl = await uploadToS3(req.file);

    if (updateData.status !== undefined) {
      if (typeof updateData.status === 'number') {
        updateData.status = CampaignState[updateData.status] || 'ACTIVE';
      } else if (
        typeof updateData.status === 'string' &&
        !['ACTIVE', 'SUCCESS', 'EXPIRED', 'ABORTED', 'WITHDRAWN', 'FAILED'].includes(updateData.status)
      ) {
        updateData.status = 'ACTIVE';
      }
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    res.json({ message: 'Campaign updated successfully', campaign: updatedCampaign });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update campaign', error: error.message });
  }
};

export const deleteCampaign = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });

    const user = await User.findById(req.user.userId);
    if (!user.walletAddress) return res.status(403).json({ message: 'Please link your wallet first' });

    const { id } = req.params;
    const campaign = await Campaign.findById(id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    if (campaign.creator.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({ message: 'Only the creator can delete this campaign' });
    }

    const deletedCampaign = await Campaign.findByIdAndDelete(id);
    res.json({ message: 'Campaign deleted successfully', campaign: deletedCampaign });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete campaign', error: error.message });
  }
};

export const claimRefund = async (req, res) => {
  try {
    const { address, contributor } = req.body;
    const campaign = await Campaign.findOne({ contractAddress: address });

    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const contract = getCampaignContract(address);
    const tx = await contract.claimRefund({ from: contributor });
    await tx.wait();

    const details = await contract.getCampaignDetails();
    campaign.totalRefunded = ethers.formatEther(details._totalRefunded);
    campaign.status = CampaignState[Number(details._state)] || 'ACTIVE';

    await campaign.save();
    res.json({ message: 'Refund claimed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to claim refund', error: error.message });
  }
};

export const withdrawFunds = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });

    const user = await User.findById(req.user.userId);
    if (!user.walletAddress) return res.status(403).json({ message: 'Please link your wallet first' });

    const { address, creator } = req.body;
    const campaign = await Campaign.findOne({ contractAddress: address });

    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (campaign.creator.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({ message: 'Only the creator can withdraw funds' });
    }
    if (creator.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({ message: 'Creator address mismatch' });
    }

    const contract = getCampaignContract(address);
    const tx = await contract.withdrawFunds({ from: creator });
    await tx.wait();

    const details = await contract.getCampaignDetails();
    campaign.status = CampaignState[Number(details._state)] || 'ACTIVE';

    await campaign.save();
    res.json({ message: 'Funds withdrawn successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to withdraw funds', error: error.message });
  }
};

// Get user campaign stats (new endpoint for Profile.jsx)
export const getUserStats = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });

    const user = await User.findById(req.user.userId);
    if (!user.walletAddress) return res.status(403).json({ message: 'Please link your wallet first' });

    // Total campaigns created
    const totalCampaigns = await Campaign.countDocuments({ creator: user.walletAddress.toLowerCase() });
    const totalContributions = 0; // Placeholder: Enhance with on-chain data or DB collection

    res.json({ totalCampaigns, totalContributions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user stats', error: error.message });
  }
};
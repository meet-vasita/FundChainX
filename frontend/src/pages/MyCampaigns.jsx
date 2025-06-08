import React, { useContext, useEffect, useState, useCallback } from 'react';
import { Web3Context } from '../contexts/Web3Context';
import { AuthContext } from '../contexts/AuthContext'; // Added
import { CampaignCard } from '../components/CampaignComponents';
import { ethers } from 'ethers';
import CampaignABI from '../contracts/Campaign.json';
import { determineClientSideCampaignStatus } from '../utils/contractHelpers';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

const MyCampaigns = () => {
  const { contract, address, provider, connectWallet } = useContext(Web3Context);
  const { user } = useContext(AuthContext); // Added
  const { addNotification } = useNotification();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchCampaignDetails = useCallback(async (campaignAddress) => {
    try {
      const campaignContract = new ethers.Contract(campaignAddress, CampaignABI.abi, provider);
      const details = await campaignContract.getCampaignDetails();
      const campaignData = {
        address: campaignAddress,
        creator: details._creator,
        minimumContribution: ethers.formatEther(details._minimumContribution),
        deadline: details._deadline.toString(),
        targetContribution: ethers.formatEther(details._targetContribution),
        raisedAmount: ethers.formatEther(details._raisedAmount),
        noOfContributors: Number(details._contributorsCount),
        state: Number(details._state),
        totalRefunded: ethers.formatEther(details._totalRefunded),
        refundPeriodEnd: details._refundPeriodEnd.toString()
      };
      const computedStatus = determineClientSideCampaignStatus(campaignData);
      return { ...campaignData, state: computedStatus };
    } catch (error) {
      console.error(`Error fetching campaign ${campaignAddress}:`, error);
      return null;
    }
  }, [provider]);

  const fetchMyCampaigns = useCallback(async () => {
    if (!contract || !address || !provider || !user) return;

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const mongoResponse = await fetch(`${apiUrl}/api/campaigns/creator/${address.toLowerCase()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!mongoResponse.ok) {
        const errorText = await mongoResponse.text();
        throw new Error(`Failed to fetch MongoDB data: ${mongoResponse.status} - ${errorText}`);
      }
      const mongoCampaigns = await mongoResponse.json();

      const combinedCampaigns = await Promise.all(
        mongoCampaigns.map(async (mongoData) => {
          const blockchainData = await fetchCampaignDetails(mongoData.contractAddress);
          if (!blockchainData || blockchainData.creator.toLowerCase() !== address.toLowerCase()) return null;
          return {
            ...blockchainData,
            title: mongoData.title || "Untitled Campaign",
            description: mongoData.description || "No description available",
            bannerUrl: mongoData.bannerUrl || "",
            category: mongoData.category || "Uncategorized",
            status: mongoData.status || "ACTIVE"
          };
        })
      );

      setCampaigns(combinedCampaigns.filter(Boolean));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setError(`Error fetching campaigns: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [contract, address, provider, user, fetchCampaignDetails]);

  useEffect(() => {
    if (user) fetchMyCampaigns();
  }, [fetchMyCampaigns, user]);

  if (!user) {
    addNotification('Please log in to view your campaigns', 'warning');
    navigate('/login');
    return null;
  }

  if (!address) {
    return (
      <div className="my-campaigns">
        <h1>My Campaigns</h1>
        <div className="connect-wallet-prompt">
          <p>Please connect your wallet to view your campaigns</p>
          <button onClick={connectWallet} className="connect-wallet-button">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-campaigns">
      <h1>My Campaigns</h1>
      {loading && <div>Loading your campaigns...</div>}
      {error && <div>Error: {error}</div>}
      {!loading && !error && campaigns.length === 0 ? (
        <p>You haven't created any campaigns yet.</p>
      ) : (
        <div className="campaigns-grid">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.address} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCampaigns;
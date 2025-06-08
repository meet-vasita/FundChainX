import { useState, useEffect, useCallback, useContext } from 'react';
import { Web3Context } from '../contexts/Web3Context';
import CampaignABI from '../contracts/Campaign.json';
import { ethers } from 'ethers';
import { handleTransactionError } from '../utils/contractHelpers';

// Use a read-only provider for fetching data when no signer is available
const RPC_URL = process.env.REACT_APP_RPC_URL || "https://sepolia.infura.io/v3/173a86041e634007924433b2cc66a6da";
const provider = new ethers.JsonRpcProvider(RPC_URL);

const validateContribution = (amount, minimumContribution, balance) => {
    const amountInWei = ethers.parseEther(amount);
    const minContributionInWei = ethers.parseEther(minimumContribution);
    if (amountInWei < minContributionInWei) {
        return { isValid: false, error: `Contribution must be at least ${minimumContribution} ETH` };
    }
    if (amountInWei > balance) {
        return { isValid: false, error: 'Insufficient balance for contribution' };
    }
    return { isValid: true };
};

const useCampaign = (campaignAddress) => {
    const { signer } = useContext(Web3Context);
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Keep for initial load errors
    const [transactionPending, setTransactionPending] = useState(false);

    const fetchCampaignData = useCallback(async (contractInstance) => {
        try {
            const details = await contractInstance.getCampaignDetails();
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
            const mongoResponse = await fetch(`${apiUrl}/api/campaigns/address/${campaignAddress}`);
            if (!mongoResponse.ok) {
                const errorText = await mongoResponse.text();
                throw new Error(`Failed to fetch MongoDB data: ${mongoResponse.status} - ${errorText}`);
            }
            const mongoData = await mongoResponse.json();

            return {
                address: campaignAddress,
                creator: details._creator,
                minimumContribution: ethers.formatEther(details._minimumContribution),
                deadline: details._deadline.toString(),
                targetContribution: ethers.formatEther(details._targetContribution),
                raisedAmount: ethers.formatEther(details._raisedAmount),
                contributorsCount: Number(details._contributorsCount),
                state: Number(details._state),
                totalRefunded: ethers.formatEther(details._totalRefunded),
                refundPeriodEnd: details._refundPeriodEnd.toString(),
                title: mongoData.title || "Untitled Campaign",
                description: mongoData.description || "No description available",
                bannerUrl: mongoData.bannerUrl || "",
                category: mongoData.category || "Uncategorized"
            };
        } catch (err) {
            throw err;
        }
    }, [campaignAddress]);

    useEffect(() => {
        const fetchCampaign = async () => {
            if (!campaignAddress) {
                setError('Missing campaign address');
                setLoading(false);
                return;
            }

            try {
                const contractInstance = new ethers.Contract(
                    campaignAddress,
                    CampaignABI.abi,
                    signer || provider
                );
                const campaignData = await fetchCampaignData(contractInstance);
                setCampaign(campaignData);

                if (signer) {
                    contractInstance.on("CampaignStateChanged", async (campaignAddress, newState) => {
                        console.log(`CampaignStateChanged event: State updated to ${newState}`);
                        const updatedData = await fetchCampaignData(contractInstance);
                        setCampaign(updatedData);
                    });

                    contractInstance.on("ContributionReceived", async (contributor, amount, currentTotal, timestamp) => {
                        console.log(`ContributionReceived event: ${contributor} contributed ${ethers.formatEther(amount)} ETH`);
                        const updatedData = await fetchCampaignData(contractInstance);
                        setCampaign(updatedData);
                    });

                    contractInstance.on("FundsWithdrawn", async (creator, amount) => {
                        console.log(`FundsWithdrawn event: ${creator} withdrew ${ethers.formatEther(amount)} ETH`);
                        const updatedData = await fetchCampaignData(contractInstance);
                        setCampaign(updatedData);
                    });

                    contractInstance.on("RefundIssued", async (contributor, amount) => {
                        console.log(`RefundIssued event: ${contributor} received ${ethers.formatEther(amount)} ETH`);
                        const updatedData = await fetchCampaignData(contractInstance);
                        setCampaign(updatedData);
                    });

                    contractInstance.on("RemainingFundsWithdrawn", async (creator, amount) => {
                        console.log(`RemainingFundsWithdrawn event: ${creator} withdrew ${ethers.formatEther(amount)} ETH`);
                        const updatedData = await fetchCampaignData(contractInstance);
                        setCampaign(updatedData);
                    });
                }

                setError(null);
            } catch (err) {
                setError(`Failed to load campaign details: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchCampaign();

        return () => {
            if (signer && campaignAddress) {
                const campaignContract = new ethers.Contract(campaignAddress, CampaignABI.abi, signer);
                campaignContract.removeAllListeners("CampaignStateChanged");
                campaignContract.removeAllListeners("ContributionReceived");
                campaignContract.removeAllListeners("FundsWithdrawn");
                campaignContract.removeAllListeners("RefundIssued");
                campaignContract.removeAllListeners("RemainingFundsWithdrawn");
            }
        };
    }, [signer, campaignAddress, fetchCampaignData]);

    const contribute = async (amount) => {
        if (!campaign || !signer) {
            return { success: false, error: 'Please connect your wallet to contribute' };
        }
        setTransactionPending(true);
    
        try {
            const campaignContract = new ethers.Contract(campaignAddress, CampaignABI.abi, signer);
            const balance = await signer.provider.getBalance(await signer.getAddress());
            const validation = validateContribution(amount, campaign.minimumContribution, balance);
            if (!validation.isValid) throw new Error(validation.error);
    
            const tx = await campaignContract.contribute({ value: ethers.parseEther(amount) });
            const receipt = await tx.wait();
    
            if (receipt.status === 1) {
                const updatedData = await fetchCampaignData(campaignContract);
                setCampaign(updatedData);
                return { success: true, amount, receipt }; 
            }
            throw new Error('Transaction failed on-chain.');
        } catch (err) {
            const error = handleTransactionError(err);
            return { 
                success: false, 
                error: error.message, 
                type: error.type,
                isCancelled: error.isCancelled  
            }; 
        } finally {
            setTransactionPending(false);
        }
    };

    const abortCampaign = async () => {
        if (!campaign || !signer) {
            return { success: false, error: 'Please connect your wallet to abort the campaign' };
        }
        setTransactionPending(true);

        try {
            const campaignContract = new ethers.Contract(campaignAddress, CampaignABI.abi, signer);
            const userAddress = await signer.getAddress();
            if (campaign.creator.toLowerCase() !== userAddress.toLowerCase()) {
                throw new Error('Only the creator can abort the campaign');
            }
            const tx = await campaignContract.abortCampaign();
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                const updatedData = await fetchCampaignData(campaignContract);
                setCampaign(updatedData);
                return { success: true, receipt };
            }
            throw new Error('Transaction failed on-chain.');
        } catch (err) {
            const error = handleTransactionError(err);
            return { success: false, error: error.message };
        } finally {
            setTransactionPending(false);
        }
    };

    const withdrawFunds = async () => {
        if (!campaign || !signer) {
            return { success: false, error: 'Please connect your wallet to withdraw funds' };
        }
        setTransactionPending(true);

        try {
            const campaignContract = new ethers.Contract(campaignAddress, CampaignABI.abi, signer);
            const userAddress = await signer.getAddress();
            if (campaign.creator.toLowerCase() !== userAddress.toLowerCase()) {
                throw new Error('Only the creator can withdraw funds');
            }
            const tx = await campaignContract.withdrawFunds();
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                const updatedData = await fetchCampaignData(campaignContract);
                setCampaign(updatedData);
                return { success: true, receipt };
            }
            throw new Error('Transaction failed on-chain.');
        } catch (err) {
            const error = handleTransactionError(err);
            return { success: false, error: error.message };
        } finally {
            setTransactionPending(false);
        }
    };

    const claimRefund = async () => {
        if (!campaign || !signer) {
            return { success: false, error: 'Please connect your wallet to claim a refund' };
        }
        setTransactionPending(true);

        try {
            const campaignContract = new ethers.Contract(campaignAddress, CampaignABI.abi, signer);
            const contributorAddress = await signer.getAddress();
            const contributorAmount = await campaignContract.contributorAmounts(contributorAddress);
            console.log('[DEBUG] Contributor Amount:', ethers.formatEther(contributorAmount));

            if (contributorAmount <= 0) {
                throw new Error('No contributions available to refund. You may have already claimed your refund.');
            }

            const contributorBalanceBefore = await signer.provider.getBalance(contributorAddress);
            const contractBalanceBefore = await signer.provider.getBalance(campaignAddress);
            console.log('[DEBUG] Contributor Balance Before:', ethers.formatEther(contributorBalanceBefore));
            console.log('[DEBUG] Contract Balance Before:', ethers.formatEther(contractBalanceBefore));

            const tx = await campaignContract.claimRefund();
            const receipt = await tx.wait();
            console.log('[DEBUG] Transaction Receipt:', receipt);

            if (receipt.status === 1) {
                const contributorBalanceAfter = await signer.provider.getBalance(contributorAddress);
                const contractBalanceAfter = await signer.provider.getBalance(campaignAddress);
                console.log('[DEBUG] Contributor Balance After:', ethers.formatEther(contributorBalanceAfter));
                console.log('[DEBUG] Contract Balance After:', ethers.formatEther(contractBalanceAfter));

                if (contributorBalanceAfter > contributorBalanceBefore) {
                    const updatedData = await fetchCampaignData(campaignContract);
                    setCampaign(updatedData);
                    return { success: true, receipt };
                } else {
                    throw new Error('Refund transfer failed: contributor balance unchanged');
                }
            }
            throw new Error('Transaction failed on-chain.');
        } catch (err) {
            const error = handleTransactionError(err);
            return { success: false, error: error.message, type: error.type };
        } finally {
            setTransactionPending(false);
        }
    };

    const withdrawRemainingFunds = async () => {
        if (!campaign || !signer) {
            return { success: false, error: 'Please connect your wallet to withdraw remaining funds' };
        }
        setTransactionPending(true);

        try {
            const campaignContract = new ethers.Contract(campaignAddress, CampaignABI.abi, signer);
            const userAddress = await signer.getAddress();
            if (campaign.creator.toLowerCase() !== userAddress.toLowerCase()) {
                throw new Error('Only the creator can withdraw remaining funds');
            }
            const tx = await campaignContract.withdrawRemainingFunds();
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                const updatedData = await fetchCampaignData(campaignContract);
                setCampaign(updatedData);
                return { success: true, receipt };
            }
            throw new Error('Transaction failed on-chain.');
        } catch (err) {
            const error = handleTransactionError(err);
            return { success: false, error: error.message };
        } finally {
            setTransactionPending(false);
        }
    };

    return {
        campaign,
        loading,
        error, // Retained for initial load errors
        transactionPending,
        contribute,
        abortCampaign,
        withdrawFunds,
        claimRefund,
        withdrawRemainingFunds
    };
};

export default useCampaign;
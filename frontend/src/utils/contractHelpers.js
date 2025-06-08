import { ethers } from 'ethers';
import CampaignABI from '../contracts/Campaign.json';

export const getCampaignContract = (address, signer) => {
    return new ethers.Contract(address, CampaignABI.abi, signer);
};

export const formatCampaignData = (details, address, mongoData = {}) => {
    return {
        address,
        creator: mongoData.creator || details[0] || 'Unknown',
        minimumContribution: ethers.formatEther(details[2] || 0),
        deadline: details[3].toString(),
        targetContribution: ethers.formatEther(details[4] || 0),
        raisedAmount: ethers.formatEther(details[1] || 0),
        state: Number(details[5] || 0),
        noOfContributors: Number(details[0] || 0),
        title: mongoData.title || 'Untitled Campaign',
        description: mongoData.description || 'No description available',
        bannerUrl: mongoData.bannerUrl || '',
        category: mongoData.category || 'Uncategorized'
    };
};

export const determineClientSideCampaignStatus = (campaign) => {
    const currentTime = Math.floor(Date.now() / 1000);
    const { state, deadline, targetContribution, raisedAmount } = campaign;
    
    if (state !== 0) {
        return state;
    }
    
    if (currentTime > Number(deadline)) {
        if (parseFloat(raisedAmount) >= parseFloat(targetContribution)) {
            return 1; // SUCCESS
        } else {
            return 5; // FAILED
        }
    }
    
    return 0; // ACTIVE
};

export const handleTransactionError = (error) => {
    if (!error) {
        return { message: 'Transaction failed: result is undefined', type: 'error' };
    }
    if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error.message?.toLowerCase().includes('user rejected')) {
        return { 
            message: 'Transaction was cancelled by user', 
            type: 'info',
            isCancelled: true
        };
    }
    if (error.code === 'INSUFFICIENT_FUNDS') {
        return { message: 'Insufficient funds for gas fee and contribution amount', type: 'error' };
    }
    if (error.message?.includes('deadline passed')) {
        return { message: 'Campaign has expired. No further contributions can be made.', type: 'error' };
    }
    if (error.message?.includes('not accepting contributions')) {
        return { message: 'Campaign is not accepting contributions.', type: 'error' };
    }
    if (error.message?.includes('contribution below minimum')) {
        return { message: 'Contribution amount is below the minimum required.', type: 'error' };
    }
    if (error.message?.includes('goal not reached')) {
        return { message: 'Cannot withdraw - Campaign goal not reached.', type: 'error' };
    }
    if (error.message?.includes('Unauthorized - Creator only')) {
        return { message: 'Only the campaign creator can perform this action.', type: 'error' };
    }
    if (error.message?.includes('network') || error.message?.includes('connection')) {
        return { message: 'Network error. Please check your connection.', type: 'error' };
    }
    if (error.message?.includes('refunds not currently allowed')) {
        return { message: 'Refunds are not currently allowed for this campaign.', type: 'error' };
    }
    if (error.message?.includes('No contributions to refund')) {
        return { message: 'No contributions available to refund. You may have already claimed your refund.', type: 'error' };
    }
    if (error.message?.includes('balance unchanged')) {
        return { message: 'Refund transfer failed: contributor balance unchanged.', type: 'error' };
    }
    return { message: `Transaction failed: ${error.message}`, type: 'error' };
};

export const getCampaignState = (stateNumber) => {
    const states = ['Active', 'Successful', 'Expired', 'Aborted', 'Withdrawn', 'Failed'];
    return states[stateNumber] || 'Unknown';
};

export const isDeadlinePassed = (deadline) => {
    const now = Math.floor(Date.now() / 1000);
    return now > Number(deadline);
};

export const calculateProgress = (raisedAmount, targetContribution) => {
    const raised = Number(raisedAmount);
    const target = Number(targetContribution);
    return target > 0 ? (raised / target) * 100 : 0;
};

export const formatAmount = (amount) => {
    return ethers.formatEther(amount.toString());
};

export const parseAmount = (amount) => {
    return ethers.parseEther(amount.toString());
};

export const validateContribution = (amount, minContribution, balance) => {
    if (!amount || isNaN(parseFloat(amount))) {
        return { isValid: false, error: 'Please enter a valid amount' };
    }
    const contributionAmount = parseAmount(amount);
    const minRequired = ethers.parseEther(minContribution.toString());
    if (contributionAmount < minRequired) {
        return { isValid: false, error: `Minimum contribution is ${ethers.formatEther(minRequired)} ETH` };
    }
    if (ethers.parseEther(balance.toString()) < contributionAmount) {
        return { isValid: false, error: 'Insufficient balance for this contribution' };
    }
    return { isValid: true };
};
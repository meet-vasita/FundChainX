import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { Button, Input, Alert, ProgressBar } from './common/CommonComponents';
import '../styles/CampaignComponents.css';
import { NotificationContext } from '../contexts/NotificationContext';
import { handleTransactionError, getCampaignState } from '../utils/contractHelpers';

const safeConvert = (value) => {
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
        return parseFloat(value);
    } else if (typeof value === 'bigint') {
        return parseFloat(ethers.formatEther(value.toString()));
    }
    return 0;
};

export const CampaignCard = ({ campaign }) => {
    const raisedAmount = safeConvert(campaign.raisedAmount);
    const targetContribution = safeConvert(campaign.targetContribution);
    const progress = targetContribution > 0 ? (raisedAmount / targetContribution) * 100 : 0;

    return (
        <div className="campaign-card">
            <img src={campaign.bannerUrl} alt={campaign.title} className="campaign-banner" />
            <h3>{campaign.title}</h3>
            <p>{campaign.description?.slice(0, 100) || ''}...</p>
            <p><strong>Category:</strong> {campaign.category || 'Uncategorized'}</p>
            <ProgressBar progress={progress} />
            <p>Goal: {targetContribution.toFixed(4)} ETH</p>
            <p>Raised: {raisedAmount.toFixed(4)} ETH</p>
            <p>Contributors: {campaign.noOfContributors || '0'}</p>
            <p>Status: {getCampaignState(campaign.state)}</p>
            <Link to={`/campaign/${campaign.address}`}>
                <Button>View Details</Button>
            </Link>
        </div>
    );
};

export const CampaignProgress = ({ raisedAmount, targetContribution }) => {
    const convertedRaised = safeConvert(raisedAmount);
    const convertedTarget = safeConvert(targetContribution);
    const progress = convertedTarget > 0 ? (convertedRaised / convertedTarget) * 100 : 0;
    return (
        <div className="campaign-progress">
            <ProgressBar progress={progress} />
            <p>Raised: {convertedRaised.toFixed(4)} ETH of {convertedTarget.toFixed(4)} ETH ({progress.toFixed(2)}%)</p>
        </div>
    );
};

export const CampaignStatus = ({ campaign }) => {
    const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
    const [statusText, setStatusText] = useState('');
    const [timeRemaining, setTimeRemaining] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Math.floor(Date.now() / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const deadlineTime = Number(campaign.deadline);
        const campaignState = Number(campaign.state);
        const status = getCampaignState(campaignState);

        setStatusText(status);

        if (status === 'Active' && currentTime < deadlineTime) {
            const remaining = deadlineTime - currentTime;
            const days = Math.floor(remaining / 86400);
            const hours = Math.floor((remaining % 86400) / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            const seconds = remaining % 60;
            setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        } else {
            setTimeRemaining('');
        }
    }, [campaign, currentTime]);

    const raisedAmount = safeConvert(campaign.raisedAmount);
    const targetContribution = safeConvert(campaign.targetContribution);
    const progress = targetContribution > 0 ? (raisedAmount / targetContribution) * 100 : 0;

    return (
        <div className={`campaign-status status-${statusText.toLowerCase()}`}>
            <h3 className="status-text">Campaign Status: <span>{statusText}</span></h3>
            <ProgressBar progress={progress} />
            <p>Raised: {raisedAmount.toFixed(4)} ETH of {targetContribution.toFixed(4)} ETH ({progress.toFixed(2)}%)</p>
            <p>Deadline: {new Date(Number(campaign.deadline) * 1000).toLocaleString()}</p>
            {timeRemaining && <p>Time Remaining: {timeRemaining}</p>}
        </div>
    );
};

export const ContributionForm = ({ minimumContribution, onContribute }) => {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addNotification } = useContext(NotificationContext);

    const minContributionEth = minimumContribution;

    const validateAmount = (amount) => {
        if (!amount) throw new Error('Please enter an amount');
        if (isNaN(parseFloat(amount))) throw new Error('Please enter a valid number');
        const amountWei = ethers.parseEther(amount);
        const minContributionWei = ethers.parseEther(minContributionEth);
        if (amountWei < minContributionWei) {
            throw new Error(`Minimum contribution is ${minContributionEth} ETH`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
      
        try {
          validateAmount(amount);
          await onContribute(amount); 
          setAmount('');
        } catch (err) {
          const { message, type } = handleTransactionError(err);
          setError(message);
          addNotification(message, type);
        } finally {
          setIsSubmitting(false);
        }
      };

    return (
        <form onSubmit={handleSubmit} className="contribution-form">
            <h3>Contribute to this campaign</h3>
            <div className="input-group">
                <Input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount in ETH"
                    disabled={isSubmitting}
                />
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className={isSubmitting ? 'loading' : ''}
                >
                    {isSubmitting ? 'Processing...' : 'Contribute'}
                </Button>
            </div>
            {error && <Alert type="error" message={error} />}
            {minContributionEth && (
                <p className="min-contribution">
                    Minimum contribution: {minContributionEth} ETH
                </p>
            )}
        </form>
    );
};

export const ContributorsList = ({ campaignContract }) => {
    const [contributorInfo, setContributorInfo] = useState({ count: 0, totalAmount: '0' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchContributorInfo = async () => {
            try {
                if (!campaignContract) throw new Error('Campaign contract is not initialized');
                const details = await campaignContract.getCampaignDetails();
                setContributorInfo({
                    count: Number(details._contributorsCount),
                    totalAmount: ethers.formatEther(details._raisedAmount)
                });
                setLoading(false);
            } catch (err) {
                setError('Failed to fetch contributor information');
                setLoading(false);
            }
        };

        if (campaignContract) fetchContributorInfo();
    }, [campaignContract]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

    return (
        <div className="contributors-list">
            <h3>Contributors</h3>
            {contributorInfo.count === 0 ? (
                <p>No contributors yet.</p>
            ) : (
                <>
                    <p>Number of contributors: {contributorInfo.count}</p>
                    <p>Total amount raised: {contributorInfo.totalAmount} ETH</p>
                </>
            )}
        </div>
    );
};

export const DonationHistory = ({ campaignContract }) => {
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDonations = async () => {
            try {
                if (!campaignContract) throw new Error("Campaign contract is not initialized");
                const contributors = await campaignContract.getContributors();
                const donationList = contributors.map(contribution => ({
                    contributor: contribution.contributor,
                    amount: ethers.formatEther(contribution.amount),
                    timestamp: new Date(Number(contribution.timestamp) * 1000).toLocaleString()
                }));
                setDonations(donationList);
                setLoading(false);
            } catch (err) {
                setError("Failed to fetch donation history");
                setLoading(false);
            }
        };

        if (campaignContract) fetchDonations();
    }, [campaignContract]);

    if (loading) return <p>Loading donation history...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;

    return (
        <div className="donation-history">
            <h3>Donation History</h3>
            {donations.length === 0 ? (
                <p>No donations yet.</p>
            ) : (
                <ul>
                    {donations.map((donation, index) => (
                        <li key={index} className="donation-item">
                            <p><strong>Contributor:</strong> {donation.contributor}</p>
                            <p><strong>Amount:</strong> {donation.amount} ETH</p>
                            <p><strong>Date:</strong> {donation.timestamp}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export const CampaignTimeline = ({ deadline }) => {
    const [timeRemaining, setTimeRemaining] = useState('');
    const [isPast, setIsPast] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const now = Math.floor(Date.now() / 1000);
            if (now >= Number(deadline)) {
                setIsPast(true);
                setTimeRemaining('Deadline passed');
                return;
            }
            const remaining = Number(deadline) - now;
            const days = Math.floor(remaining / 86400);
            const hours = Math.floor((remaining % 86400) / 3600);
            const minutes = Math.floor((remaining % 3600) / 60);
            const seconds = remaining % 60;
            setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);
        return () => clearInterval(intervalId);
    }, [deadline]);

    return (
        <div className="campaign-timeline">
            <h3>Campaign Timeline</h3>
            <div className="timeline-container">
                <div className="timeline-item">
                    <div className="timeline-marker start-marker"></div>
                    <div className="timeline-content">
                        <p>Campaign Started</p>
                    </div>
                </div>
                <div className="timeline-progress">
                    <div className={`timeline-bar ${isPast ? 'completed' : 'in-progress'}`}></div>
                </div>
                <div className="timeline-item">
                    <div className={`timeline-marker end-marker ${isPast ? 'passed' : ''}`}></div>
                    <div className="timeline-content">
                        <p>Deadline: {new Date(Number(deadline) * 1000).toLocaleString()}</p>
                        <p className="countdown">{timeRemaining}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const RefundForm = ({ onClaimRefund }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const { addNotification } = useContext(NotificationContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const result = await onClaimRefund();
            if (result.success) {
                addNotification('Refund claimed successfully!', 'success');
            } else {
                throw new Error(result.error || 'Transaction failed');
            }
        } catch (err) {
            const { message, type } = handleTransactionError(err);
            setError(message);
            addNotification(message, type);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="refund-form">
            <h3>Claim Refund</h3>
            <Button
                type="submit"
                disabled={isSubmitting}
                className={isSubmitting ? 'loading' : ''}
            >
                {isSubmitting ? 'Processing...' : 'Claim Refund'}
            </Button>
            {error && <Alert type="error" message={error} />}
        </form>
    );
};

export const WithdrawForm = ({ onWithdrawFunds, label = "Withdraw Funds" }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const { addNotification } = useContext(NotificationContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const result = await onWithdrawFunds();
            if (result.success) {
                addNotification(`${label} successful!`, 'success');
            } else {
                throw new Error(result.error || 'Transaction failed');
            }
        } catch (err) {
            const { message, type } = handleTransactionError(err);
            setError(message);
            addNotification(message, type);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="withdraw-form">
            <h3>{label}</h3>
            <Button
                type="submit"
                disabled={isSubmitting}
                className={isSubmitting ? 'loading' : ''}
            >
                {isSubmitting ? 'Processing...' : label}
            </Button>
            {error && <Alert type="error" message={error} />}
        </form>
    );
};


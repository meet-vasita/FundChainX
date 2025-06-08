import React, { useContext, useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import useCampaign from "../hooks/useCampaign";
import { ContributionForm, ContributorsList, CampaignTimeline, DonationHistory, RefundForm, WithdrawForm } from "../components/CampaignComponents";
import { Web3Context } from "../contexts/Web3Context";
import { AuthContext } from "../contexts/AuthContext";
import { NotificationContext } from "../contexts/NotificationContext";
import { getCampaignContract } from "../utils/contractHelpers";
import { Button, Alert } from "../components/common/CommonComponents";
import "../styles/CampaignDetails.css";

const CampaignDetails = () => {
  const { address } = useParams();
  const { signer, address: connectedAddress } = useContext(Web3Context);
  const { user } = useContext(AuthContext);
  const { addNotification } = useContext(NotificationContext);
  const { campaign, loading, error, contribute, abortCampaign, withdrawFunds, claimRefund, withdrawRemainingFunds, transactionPending } = useCampaign(address);
  const [isAborting, setIsAborting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const navigate = useNavigate();

  // Enhanced debugging and state update logic
  useEffect(() => {
    const updateCampaignStatus = async () => {
      if (signer && campaign && Number(campaign.state) === 0 && Math.floor(Date.now() / 1000) > Number(campaign.deadline)) {
        const campaignContract = getCampaignContract(address, signer);
        await campaignContract.checkCampaignStatus();
        console.log('[DEBUG] Called checkCampaignStatus to update state');
      }
      console.log('[DEBUG] Campaign Data:', campaign);
      if (campaign && Number(campaign.state) === 5) { // FAILED state
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const refundPeriodEnd = Number(campaign.refundPeriodEnd);

        if (refundPeriodEnd > 0) {
          if (currentTimestamp < refundPeriodEnd) {
            const secondsRemaining = refundPeriodEnd - currentTimestamp;
            const daysRemaining = Math.ceil(secondsRemaining / (24 * 60 * 60));
            console.log(`[DEBUG] Campaign ${address}: Creator can withdraw remaining funds in ${daysRemaining} days`);
            console.log(`[DEBUG] Refund period ends at: ${new Date(refundPeriodEnd * 1000).toLocaleString()}`);
            console.log(`[DEBUG] Current time: ${new Date(currentTimestamp * 1000).toLocaleString()}`);
          } else {
            console.log(`[DEBUG] Campaign ${address}: Creator can withdraw remaining funds now (refund period ended)`);
            console.log(`[DEBUG] Refund period ended at: ${new Date(refundPeriodEnd * 1000).toLocaleString()}`);
          }
        } else {
          console.log('[DEBUG] refundPeriodEnd is not set or invalid');
        }
      } else if (campaign) {
        console.log(`[DEBUG] Campaign ${address} is not in FAILED state. Current state: ${campaign.state}`);
      }
    };
    updateCampaignStatus();
  }, [campaign, address, signer]);

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div><p>Loading campaign details...</p></div>;
  if (error) return <Alert type="error" message={`Error: ${error}`} />;
  if (!campaign) return <Alert type="error" message="Campaign not found" />;

  const campaignContract = signer ? getCampaignContract(address, signer) : null;
  const isCreator = connectedAddress && campaign.creator.toLowerCase() === connectedAddress.toLowerCase();
  const isActive = Number(campaign.state) === 0; // ACTIVE
  const isSuccess = Number(campaign.state) === 1; // SUCCESS
  const isExpired = Number(campaign.state) === 2; // EXPIRED
  const isAborted = Number(campaign.state) === 3; // ABORTED
  const isWithdrawn = Number(campaign.state) === 4; // WITHDRAWN
  const isFailed = Number(campaign.state) === 5; // FAILED
  const canRefund = (isFailed || isAborted) && Number(campaign.refundPeriodEnd) > Math.floor(Date.now() / 1000);
  const creatorCanWithdrawRemaining = isCreator && isFailed && Number(campaign.refundPeriodEnd) < Math.floor(Date.now() / 1000);

  const getStatusClass = () => {
    switch (Number(campaign.state)) {
      case 0: return "status-active"; // ACTIVE
      case 1: return "status-success"; // SUCCESS
      case 2: return "status-expired"; // EXPIRED
      case 3: return "status-aborted"; // ABORTED
      case 4: return "status-withdrawn"; // WITHDRAWN
      case 5: return "status-failed"; // FAILED
      default: return "";
    }
  };

  const getStatusText = () => {
    switch (Number(campaign.state)) {
      case 0: return "Active"; // ACTIVE
      case 1: return "Successful"; // SUCCESS
      case 2: return "Expired"; // EXPIRED
      case 3: return "Aborted"; // ABORTED
      case 4: return "Withdrawn"; // WITHDRAWN
      case 5: return "Failed"; // FAILED
      default: return "Unknown";
    }
  };

  const handleAbortCampaign = async () => {
    if (!signer) {
      addNotification("Please connect your wallet to abort the campaign", "warning");
      navigate('/login');
      return;
    }
    setIsAborting(true);
    try {
      const result = await abortCampaign();
      if (result.success) {
        addNotification("Campaign aborted successfully!", "info");
      } else {
        addNotification(result.error, result.type || "error");
      }
    } catch (err) {
      addNotification(`Error: Failed to abort campaign: ${err.message}`, "error");
    } finally {
      setIsAborting(false);
    }
  };

  const handleContribute = async (amount) => {
    if (!user) {
      addNotification("To contribute, you have to Login or Signup", "warning");
      navigate('/login');
      return;
    }
    if (!connectedAddress) {
      addNotification("Please connect your wallet to contribute", "warning");
      return;
    }
    try {
      const result = await contribute(amount);
      if (result.success) {
        addNotification(`Contributed ${result.amount} ETH successfully!`, "success");
      } else if (result.isCancelled) {
        addNotification("Transaction was cancelled by user", "info");
      } else {
        addNotification(result.error, result.type || "error");
      }
    } catch (err) {
      addNotification(`Error: Contribution failed: ${err.message}`, "error");
    }
  };

  const handleWithdrawFunds = async () => {
    if (!connectedAddress) {
      addNotification("Please connect your wallet to withdraw", "warning");
      navigate('/login');
      return;
    }
    try {
      const result = await withdrawFunds();
      if (result.success) {
        addNotification("Funds withdrawn successfully!", "success");
      } else {
        addNotification(result.error, result.type || "error");
      }
    } catch (err) {
      addNotification(`Error: Withdrawal failed: ${err.message}`, "error");
    }
  };

  const handleClaimRefund = async () => {
    if (!connectedAddress) {
      addNotification("Please connect your wallet to claim a refund", "warning");
      navigate('/login');
      return;
    }
    try {
      const result = await claimRefund();
      if (result.success) {
        addNotification("Refund claimed successfully!", "success");
      } else {
        addNotification(result.error, result.type || "error");
      }
    } catch (err) {
      addNotification(`Error: Refund failed: ${err.message}`, "error");
    }
  };

  const handleWithdrawRemainingFunds = async () => {
    if (!connectedAddress) {
      addNotification("Please connect your wallet to withdraw", "warning");
      navigate('/login');
      return;
    }
    try {
      const result = await withdrawRemainingFunds();
      if (result.success) {
        addNotification("Remaining funds withdrawn successfully!", "success");
      } else {
        addNotification(result.error, result.type || "error");
      }
    } catch (err) {
      addNotification(`Error: Withdrawal failed: ${err.message}`, "error");
    }
  };

  const calculateTimeLeft = () => {
    if (!campaign) return null;
    
    const deadline = Number(campaign.deadline);
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = deadline - now;
    
    if (timeLeft <= 0) return { days: 0, hours: 0, minutes: 0 };
    
    const days = Math.floor(timeLeft / (24 * 60 * 60));
    const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
    
    return { days, hours, minutes };
  };

  const timeLeft = calculateTimeLeft();
  const progressPercentage = campaign ? (Number(campaign.raisedAmount) / Number(campaign.targetContribution)) * 100 : 0;

  return (
    <div className="campaign-details-container">
      <div className="campaign-header">
        <div className="campaign-header-content">
          <div className={`campaign-status-badge ${getStatusClass()}`}>
            {getStatusText()}
          </div>
          <h1>{campaign.title}</h1>
          <div className="campaign-category">
            <span>Category:</span> {campaign.category}
          </div>
        </div>
      </div>

      <div className="campaign-body">
        <div className="campaign-main">
          <div className="campaign-banner-container">
            {campaign.bannerUrl ? (
              <img
                src={campaign.bannerUrl}
                alt={campaign.title}
                className="campaign-banner"
                onError={(e) => {
                  setImageError(true);
                  e.target.style.display = 'none';
                }}
                onLoad={() => setImageError(false)}
              />
            ) : (
              <div className="campaign-banner-placeholder">
                <span>No image available</span>
              </div>
            )}
            {imageError && <Alert type="warning" message="Failed to load campaign image" />}
          </div>

          <div className="campaign-tabs">
            <div 
              className={`tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </div>
            <div 
              className={`tab ${activeTab === 'updates' ? 'active' : ''}`}
              onClick={() => setActiveTab('updates')}
            >
              Updates
            </div>
            <div 
              className={`tab ${activeTab === 'contributors' ? 'active' : ''}`}
              onClick={() => setActiveTab('contributors')}
            >
              Contributors
            </div>
            <div 
              className={`tab ${activeTab === 'donations' ? 'active' : ''}`}
              onClick={() => setActiveTab('donations')}
            >
              Donations
            </div>
          </div>

          <div className="tab-content">
            {activeTab === 'details' && (
              <div className="campaign-description">
                <p>{campaign.description}</p>
              </div>
            )}
            
            {activeTab === 'updates' && (
              <div className="campaign-updates">
                <p>No updates available for this campaign yet.</p>
              </div>
            )}
            
            {activeTab === 'contributors' && (
              <div className="campaign-contributors">
                <ContributorsList campaignContract={campaignContract} />
              </div>
            )}
            
            {activeTab === 'donations' && (
              <div className="campaign-donations">
                <DonationHistory campaignContract={campaignContract} />
              </div>
            )}
          </div>
        </div>

        <div className="campaign-sidebar">
          <div className="sidebar-card funding-status">
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(progressPercentage, 100)}%` }}></div>
              </div>
              <div className="progress-stats">
                <div className="stat">
                  <div className="stat-value">{campaign.raisedAmount} ETH</div>
                  <div className="stat-label">raised of {campaign.targetContribution} ETH</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{Math.round(progressPercentage)}%</div>
                  <div className="stat-label">funded</div>
                </div>
              </div>
            </div>

            {isActive && timeLeft && (
              <div className="countdown">
                <div className="countdown-item">
                  <div className="countdown-value">{timeLeft.days}</div>
                  <div className="countdown-label">Days</div>
                </div>
                <div className="countdown-item">
                  <div className="countdown-value">{timeLeft.hours}</div>
                  <div className="countdown-label">Hours</div>
                </div>
                <div className="countdown-item">
                  <div className="countdown-value">{timeLeft.minutes}</div>
                  <div className="countdown-label">Minutes</div>
                </div>
              </div>
            )}

            {!isActive && (
              <div className="deadline-info">
                <p><strong>Deadline was:</strong> {new Date(Number(campaign.deadline) * 1000).toLocaleString()}</p>
                {(isFailed || isAborted) && canRefund && (
                  <p><strong>Refund Period Ends:</strong> {new Date(Number(campaign.refundPeriodEnd) * 1000).toLocaleString()}</p>
                )}
                {isExpired && (
                  <p><strong>Status:</strong> Campaign expired without meeting its goal.</p>
                )}
                {isWithdrawn && (
                  <p><strong>Status:</strong> Funds have been withdrawn by the creator.</p>
                )}
              </div>
            )}

            {isActive && (
              <div className="contribute-section">
                <ContributionForm
                  minimumContribution={campaign.minimumContribution}
                  onContribute={handleContribute}
                />
                {!user && (
                  <div className="login-prompt">
                    <p>To contribute, please <Link to="/login">Login</Link> or <Link to="/signup">Signup</Link></p>
                  </div>
                )}
              </div>
            )}

            {isCreator && isActive && (
              <div className="abort-campaign-section">
                <Button
                  onClick={handleAbortCampaign}
                  className="abort-campaign-btn"
                  disabled={isAborting || transactionPending}
                >
                  {isAborting ? "Processing Abort..." : "Abort Campaign"}
                </Button>
              </div>
            )}

            {isCreator && isSuccess && (
              <WithdrawForm onWithdrawFunds={handleWithdrawFunds} label="Withdraw Funds" />
            )}

            {canRefund && (
              <RefundForm onClaimRefund={handleClaimRefund} />
            )}

            {creatorCanWithdrawRemaining && (
              <WithdrawForm onWithdrawFunds={handleWithdrawRemainingFunds} label="Withdraw Remaining Funds" />
            )}
          </div>

          <div className="sidebar-card campaign-timeline-card">
            <h3>Campaign Timeline</h3>
            <CampaignTimeline deadline={Number(campaign.deadline)} />
          </div>

          <div className="sidebar-card campaign-stats">
            <h3>Campaign Stats</h3>
            <div className="stat-row">
              <div className="stat-label">Total Refunded:</div>
              <div className="stat-value">{campaign.totalRefunded} ETH</div>
            </div>
            <div className="stat-row">
              <div className="stat-label">Minimum Contribution:</div>
              <div className="stat-value">{campaign.minimumContribution} ETH</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetails;
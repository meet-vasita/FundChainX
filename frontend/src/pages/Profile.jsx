import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import { AuthContext } from '../contexts/AuthContext';
import { Web3Context } from '../contexts/Web3Context';
import { useNotification } from '../contexts/NotificationContext';
import { Button, Input, Spinner, Modal } from '../components/common/CommonComponents';
import NotificationContainer from '../components/Notifications';
import '../styles/Profile.css';

const Profile = () => {
  const { user, token, logout } = useContext(AuthContext);
  const { address, connectWallet, isConnecting, isWalletInstalled } = useContext(Web3Context);
  const { addNotification } = useNotification();
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    walletAddress: '',
    bio: '',
  });
  const [campaignStats, setCampaignStats] = useState({
    totalCampaigns: 0,
    totalContributions: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });
  const [isVerified, setIsVerified] = useState(true);
  
  const walletNotificationShown = useRef(false);
  const isFetchingData = useRef(false);

  useEffect(() => {
    if (!user || !token) return;
    
    if (isFetchingData.current) return;
    
    const fetchProfileData = async () => {
      isFetchingData.current = true;
      setLoading(true);
      
      try {
        const userResponse = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (userResponse.data && userResponse.data.user) {
          const { email, walletAddress, fullName = '', bio = '' } = userResponse.data.user;
          setProfileData({ email, walletAddress, fullName, bio });
          
          if (!walletAddress && !address && !walletNotificationShown.current) {
            addNotification('Please link your wallet to continue', 'info');
            walletNotificationShown.current = true;
          }
        }

        try {
          const verifyResponse = await axios.get('/api/auth/verify-status', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setIsVerified(verifyResponse.data.isVerified);
        } catch (verifyErr) {
          console.error('Error checking verification status:', verifyErr);
        }

        try {
          const statsResponse = await axios.get('/api/campaigns/user/stats', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setCampaignStats({
            totalCampaigns: statsResponse.data.totalCampaigns || 0,
            totalContributions: statsResponse.data.totalContributions || 0,
          });
        } catch (statsErr) {
          console.error('Error fetching campaign stats:', statsErr);
        }
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Failed to load profile data';
        addNotification(errorMsg, 'error');
      } finally {
        setLoading(false);
        isFetchingData.current = false;
      }
    };
    
    fetchProfileData();
    
    return () => {
      isFetchingData.current = false;
    };
  }, [user, token, address, addNotification]); 

  useEffect(() => {
    if (address && profileData.walletAddress && address.toLowerCase() !== profileData.walletAddress.toLowerCase()) {
      if (!walletNotificationShown.current) {
        addNotification('Connected wallet does not match your profile. Consider re-linking it.', 'warning');
        walletNotificationShown.current = true;
      }
    }
  }, [address, profileData.walletAddress, addNotification]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const response = await axios.put(
        '/api/auth/profile',
        { fullName: profileData.fullName, bio: profileData.bio },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const successMsg = response.data.message || 'Profile updated successfully';
      addNotification(successMsg, 'success');
      setIsEditing(false);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update profile';
      addNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileData.walletAddress);
    addNotification('Wallet address copied to clipboard!', 'success');
  };

  const handleRelinkWallet = async () => {
    try {
      if (!address) {
        const connectedAddress = await connectWallet();
        if (!connectedAddress) {
          addNotification('Failed to connect wallet. Please try again.', 'error');
          return;
        }
        await proceedWithWalletLinking(connectedAddress);
        return;
      }
      await proceedWithWalletLinking(address);
    } catch (err) {
      const errorMsg = err.message || 'Failed to re-link wallet';
      addNotification(errorMsg, 'error');
    }
  };

  const proceedWithWalletLinking = async (walletAddress) => {
    if (!walletAddress) {
      addNotification('Wallet connection failed. Please try again.', 'error');
      return;
    }

    if (!ethers.isAddress(walletAddress)) {
      addNotification('Invalid wallet address. Please reconnect your wallet.', 'error');
      return;
    }

    try {
      const messageToSign = `Link wallet to FundChainX for user ${profileData.email}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [messageToSign, walletAddress],
      });

      const response = await axios.post(
        '/api/auth/link-wallet',
        { signature, walletAddress },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setProfileData((prev) => ({ ...prev, walletAddress }));
      
      walletNotificationShown.current = false;
      
      const successMsg = response.data.message || 'Wallet linked successfully';
      addNotification(successMsg, 'success');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      const errorMsg = err.message || 'Failed to link wallet';
      addNotification(errorMsg, 'error');
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        '/api/auth/change-password',
        passwordData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const successMsg = response.data.message || 'Password changed successfully';
      addNotification(successMsg, 'success');
      setPasswordData({ currentPassword: '', newPassword: '' });
      setPasswordModalOpen(false);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to change password';
      addNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        '/api/auth/resend-verification',
        { email: profileData.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const successMsg = response.data.message || 'Verification email sent';
      addNotification(successMsg, 'success');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to resend verification email';
      addNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div className="profile-page">
      <h1>User Profile</h1>

      {loading && <Spinner />}
      {/* Move notification container outside the main component to prevent re-renders */}
      <NotificationContainer />

      <div className="profile-container">
        <div className="profile-info">
          <h2>Profile Information</h2>
          <div className="profile-field">
            <label>Full Name:</label>
            {isEditing ? (
              <Input
                name="fullName"
                value={profileData.fullName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
              />
            ) : (
              <span>{profileData.fullName || 'Not set'}</span>
            )}
          </div>
          <div className="profile-field">
            <label>Email:</label>
            <span>{profileData.email}</span>
          </div>
          <div className="profile-field">
            <label>Wallet Address:</label>
            <span>
              {profileData.walletAddress || 'Not linked'}
              {profileData.walletAddress && (
                <Button className="copy-btn" onClick={copyToClipboard}>
                  Copy
                </Button>
              )}
            </span>
          </div>
          <div className="profile-field">
            <label>Bio:</label>
            {isEditing ? (
              <Input
                type="textarea"
                name="bio"
                value={profileData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself"
              />
            ) : (
              <span>{profileData.bio || 'Not set'}</span>
            )}
          </div>
          <div className="profile-field">
            <label>Total Campaigns Created:</label>
            <span>{campaignStats.totalCampaigns}</span>
          </div>
          <div className="profile-field">
            <label>Total Contributions Made:</label>
            <span>{campaignStats.totalContributions}</span>
          </div>
        </div>

        <div className="profile-actions">
          <h2>Actions</h2>
          {isEditing ? (
            <div className="edit-actions">
              <Button onClick={handleSaveProfile} disabled={loading}>
                Save
              </Button>
              <Button onClick={() => setIsEditing(false)} disabled={loading}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
          <Button 
            onClick={handleRelinkWallet} 
            disabled={loading || isConnecting}
            className={!profileData.walletAddress ? "primary-button" : ""}
          >
            {isConnecting
              ? 'Connecting...'
              : address
              ? address.toLowerCase() === profileData.walletAddress?.toLowerCase()
                ? 'Connected'
                : 'Re-Link Wallet'
              : 'Connect Wallet'}
          </Button>
          {!isWalletInstalled && <p>Please install MetaMask to link a wallet.</p>}
          {address && profileData.walletAddress && address.toLowerCase() !== profileData.walletAddress.toLowerCase() && (
            <p className="wallet-mismatch">
              Connected wallet does not match the linked wallet. Click "Re-Link Wallet" to update.
            </p>
          )}
          <Button onClick={() => setPasswordModalOpen(true)} disabled={loading}>
            Change Password
          </Button>
          {!isVerified && (
            <Button onClick={handleResendVerification} disabled={loading}>
              Resend Verification Email
            </Button>
          )}
          <Button onClick={logout} disabled={loading} className="logout-btn">
            Logout
          </Button>
        </div>
      </div>

      <Modal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)}>
        <h2>Change Password</h2>
        <Input
          type="password"
          name="currentPassword"
          placeholder="Current Password"
          value={passwordData.currentPassword}
          onChange={handlePasswordChange}
        />
        <Input
          type="password"
          name="newPassword"
          placeholder="New Password"
          value={passwordData.newPassword}
          onChange={handlePasswordChange}
        />
        <Button onClick={handleChangePassword} disabled={loading}>
          Change Password
        </Button>
      </Modal>
    </div>
  );
};

export default Profile;
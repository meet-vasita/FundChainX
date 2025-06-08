// src/pages/CreateCampaign.jsx
import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Web3Context } from '../contexts/Web3Context';
import CampaignForm from '../components/CampaignForm';
import { useNotification } from '../contexts/NotificationContext';

const CreateCampaign = () => {
  const { user } = useContext(AuthContext);
  const { address, connectWallet, isWalletInstalled } = useContext(Web3Context);
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      addNotification('Please log in to create a campaign', 'warning');
      navigate('/login');
    } else if (!address) {
      const connect = async () => {
        if (!isWalletInstalled) {
          addNotification("Please install MetaMask to create a campaign", "warning");
          return;
        }
        const success = await connectWallet();
        if (!success) {
          addNotification("Please connect your wallet to create a campaign", "warning");
          navigate('/profile');
        }
      };
      connect();
    }
  }, [user, address, connectWallet, isWalletInstalled, addNotification, navigate]);

  if (!user || !address) {
    return null; // Loading state handled by useEffect
  }

  return (
    <div className="create-campaign">
      <CampaignForm />
    </div>
  );
};

export default CreateCampaign;
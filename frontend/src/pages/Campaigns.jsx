// src/pages/Campaigns.jsx
import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Web3Context } from '../contexts/Web3Context';
import SearchFilter from '../components/SearchFilter';
import { CampaignCard } from '../components/CampaignComponents';
import { formatCampaignData, determineClientSideCampaignStatus } from '../utils/contractHelpers';
import '../styles/Campaigns.css';
import { ethers } from 'ethers';
import CampaignABI from '../contracts/Campaign.json';

const Campaigns = () => {
  const { contract, provider } = useContext(Web3Context);
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!contract) {
        setError('Web3 not initialized. Please connect your wallet.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const deployedCampaigns = await contract.getDeployedCampaigns();

        const campaignDetails = await Promise.all(
          deployedCampaigns.map(async (address) => {
            try {
              const contractProvider = contract.runner.provider || provider || contract.runner;
              const campaignContract = new ethers.Contract(address, CampaignABI.abi, contractProvider);
              const summary = await campaignContract.getCampaignSummary();
              const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
              const response = await fetch(`${apiUrl}/api/campaigns/address/${address}`);
              const mongoData = await response.json() || {};

              const campaignData = formatCampaignData(summary, address, mongoData);
              campaignData.state = determineClientSideCampaignStatus(campaignData);
              return campaignData;
            } catch (contractError) {
              console.error(`Failed to fetch campaign data for ${address}:`, contractError);
              return null;
            }
          })
        );

        const validCampaigns = campaignDetails.filter(campaign => campaign !== null);
        setCampaigns(validCampaigns);
        setLoading(false);
      } catch (error) {
        console.error('Fetch campaigns error:', error);
        setError(`Failed to fetch campaigns: ${error.message}. Please try again later.`);
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [contract, provider]);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleFilter = (selectedFilter) => {
    setFilter(selectedFilter);
  };

  const handleCategoryFilter = (selectedCategory) => {
    setCategoryFilter(selectedCategory);
  };

  const currentTime = Math.floor(Date.now() / 1000);
  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesFilter = filter === 'all';
    let matchesCategory = categoryFilter === 'all' || 
      (campaign.category || 'Uncategorized').toLowerCase() === categoryFilter.toLowerCase();

    if (!matchesFilter) {
      switch (filter) {
        case 'active':
          matchesFilter = campaign.state === 0 && campaign.deadline > currentTime;
          break;
        case 'successful':
          matchesFilter = campaign.state === 1;
          break;
        case 'expired':
          matchesFilter = campaign.state === 2;
          break;
        case 'aborted':
          matchesFilter = campaign.state === 3;
          break;
        case 'withdrawn':
          matchesFilter = campaign.state === 4;
          break;
        case 'failed':
          matchesFilter = campaign.state === 5;
          break;
        default:
          matchesFilter = false;
      }
    }

    return matchesSearch && matchesFilter && matchesCategory;
  });

  const categories = ["all", "Technology", "Art", "Charity", "Education", "Health", "Nature", "Other"];

  if (loading) {
    return <div className="loading">Loading campaigns...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="campaigns">
      <h1>Campaigns</h1>
      <SearchFilter onSearch={handleSearch} onFilter={handleFilter} />
      <div className="category-filter">
        <label>Filter by Category: </label>
        <select value={categoryFilter} onChange={(e) => handleCategoryFilter(e.target.value)}>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
          ))}
        </select>
      </div>
      {filteredCampaigns.length === 0 ? (
        <div className="no-campaigns">
          <p>No {filter !== 'all' ? filter : 'active'} campaigns found.</p>
          <button onClick={() => navigate('/create')}>Create a Campaign</button>
        </div>
      ) : (
        <div className="campaigns-grid">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.address} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Campaigns;
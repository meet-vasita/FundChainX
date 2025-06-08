import React, { useState, useContext } from "react";
import { Web3Context } from "../contexts/Web3Context";
import { AuthContext } from "../contexts/AuthContext"; // Added
import { parseEther } from "ethers";
import { useNavigate } from "react-router-dom";
import { Button, Input, Alert } from "./common/CommonComponents";
import { useNotification } from "../contexts/NotificationContext";
import "../styles/CampaignForm.css";
import axios from 'axios'; // Added for authenticated API calls

const CampaignForm = () => {
  const { contract, address } = useContext(Web3Context);
  const { user } = useContext(AuthContext); // Added
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    minimumContribution: "",
    targetContribution: "",
    deadline: "",
    bannerImage: null,
    category: ""
  });

  const [loading, setLoading] = useState({ active: false, message: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
        setError("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit.");
        return;
      }
      setFormData({ ...formData, bannerImage: file });
      setError("");
    }
  };

  const validateForm = () => {
    if (!formData.title || !formData.description) return "Title and description are required.";
    if (!formData.minimumContribution || isNaN(formData.minimumContribution) || formData.minimumContribution <= 0)
      return "Minimum contribution must be a positive number.";
    if (!formData.targetContribution || isNaN(formData.targetContribution) || formData.targetContribution <= 0)
      return "Target contribution must be a positive number.";
    if (!formData.deadline || new Date(formData.deadline) <= new Date())
      return "Deadline must be in the future.";
    if (!formData.bannerImage) return "Banner image is required.";
    if (!formData.category) return "Category is required.";
    return "";
  };

  // Modify the handleSubmit function in CampaignForm.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  const validationError = validateForm();
  if (validationError) {
    setError(validationError);
    addNotification(validationError, "error");
    return;
  }

  if (!user) {
    setError("You must be logged in to create a campaign.");
    addNotification("Please log in to create a campaign", "warning");
    navigate('/login');
    return;
  }

  setLoading({ active: true, message: "Preparing transaction..." });
  setError("");

  try {
    if (!contract || !address) throw new Error("Wallet not connected.");

    const deadlineTimestamp = Math.floor(new Date(formData.deadline).getTime() / 1000);
    const minimumContributionWei = parseEther(formData.minimumContribution);
    const targetContributionWei = parseEther(formData.targetContribution);

    setLoading({ active: true, message: "Creating campaign on blockchain..." });
    const tx = await contract.createCampaign(minimumContributionWei, targetContributionWei, deadlineTimestamp);
    setLoading({ active: true, message: "Waiting for transaction confirmation..." });
    const receipt = await tx.wait();

    const campaignAddress = receipt.logs
      .map((log) => contract.interface.parseLog(log))
      .filter((parsed) => parsed?.name === "CampaignCreated")[0]
      ?.args.campaignAddress;

    if (!campaignAddress) throw new Error("Failed to extract campaign address.");

    // Create a single FormData object with all the campaign data
    const campaignFormData = new FormData();
    campaignFormData.append("title", formData.title);
    campaignFormData.append("description", formData.description);
    campaignFormData.append("contractAddress", campaignAddress);
    campaignFormData.append("minimumContribution", formData.minimumContribution);
    campaignFormData.append("targetContribution", formData.targetContribution);
    campaignFormData.append("deadline", formData.deadline);
    campaignFormData.append("category", formData.category);
    campaignFormData.append("status", "ACTIVE");
    
    // Use the correct field name for the file upload
    if (formData.bannerImage) {
      campaignFormData.append("banner", formData.bannerImage);
    }

    setLoading({ active: true, message: "Saving campaign..." });
    await axios.post(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/campaigns`,
      campaignFormData,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    addNotification("Campaign created successfully! 🎉", "success");
    navigate(`/campaign/${campaignAddress}`);
  } catch (err) {
    console.error("Campaign creation error:", err);
    setError(`Failed to create campaign: ${err.response?.data?.message || err.message}`);
    addNotification(`Error: ${err.response?.data?.message || err.message}`, "error");
  } finally {
    setLoading({ active: false, message: "" });
  }
};

  const categories = ["Technology", "Art", "Charity", "Education", "Health", "Nature", "Other"];

  return (
    <div className="campaign-form">
      <h2>Create a New Campaign</h2>
      {error && <Alert type="error" message={error} />}
      <form onSubmit={handleSubmit}>
        <Input label="Campaign Title" name="title" value={formData.title} onChange={handleChange} required />
        <Input label="Campaign Description" name="description" value={formData.description} onChange={handleChange} type="textarea" required />
        <Input label="Minimum Contribution (ETH)" name="minimumContribution" value={formData.minimumContribution} onChange={handleChange} type="number" step="0.01" required />
        <Input label="Target Contribution (ETH)" name="targetContribution" value={formData.targetContribution} onChange={handleChange} type="number" step="0.01" required />
        <Input label="Deadline" name="deadline" value={formData.deadline} onChange={handleChange} type="datetime-local" required />
        <div className="form-group">
          <label htmlFor="bannerImage">Banner Image</label>
          <input id="bannerImage" name="bannerImage" type="file" accept="image/*" onChange={handleImageChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={loading.active}>
          {loading.active ? loading.message : "Create Campaign"}
        </Button>
      </form>
    </div>
  );
};

export default CampaignForm;
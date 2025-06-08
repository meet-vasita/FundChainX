import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Web3Context } from '../contexts/Web3Context';
import { AuthContext } from '../contexts/AuthContext';
import Navbar from './Navbar';
import { Button } from './common/CommonComponents';
import { Input } from './common/CommonComponents';
import { useNotification } from '../contexts/NotificationContext';
import GlobeComponent from './Globe';
import '../styles/LandingPage.css';

const LandingPage = () => {
  const { address, connectWallet, isWalletInstalled } = useContext(Web3Context);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const handleExplore = () => {
    navigate('/campaigns');
  };

  const handleCreateCampaign = async () => {
    if (!user) {
      addNotification("Please log in to create a campaign", "warning");
      navigate('/login');
      return;
    }
    if (address) {
      navigate('/create');
    } else if (isWalletInstalled) {
      const success = await connectWallet();
      if (success) navigate('/create');
      else addNotification("Please connect your wallet to create a campaign", "warning");
    } else {
      addNotification("Please install MetaMask to create a campaign", "warning");
    }
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    addNotification("Subscribed to newsletter!", "success");
  };

  return (
    <div className="landing-container">
      <Navbar />
      <section className="hero">
        <div className="hero-content">
          <h1>Empowering Ideas. Backed by the Blockchain.</h1>
          <p>Secure, transparent, and decentralized platform to fund what matters.</p>
          <div className="hero-buttons">
            <Button onClick={handleCreateCampaign}>Start a Campaign</Button>
            <Button onClick={handleExplore} className="secondary">Explore Campaigns</Button>
          </div>
        </div>
        <div className="hero-illustration">
          <GlobeComponent />
        </div>
      </section>

      <section className="how-it-works">
        <h2>How FundChainX Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-icon">📝</div>
            <h3>Create a Campaign</h3>
            <p>Fill in campaign details and submit for approval.</p>
          </div>
          <div className="step">
            <div className="step-icon">✅</div>
            <h3>Approval via Smart Contract</h3>
            <p>Hybrid model ensures legitimacy.</p>
          </div>
          <div className="step">
            <div className="step-icon">🤝</div>
            <h3>Get Backed by the Community</h3>
            <p>Real-time blockchain-based funding.</p>
          </div>
          <div className="step">
            <div className="step-icon">💸</div>
            <h3>Transparent Fund Disbursement</h3>
            <p>Funds released upon milestones or success.</p>
          </div>
        </div>
      </section>

      <section className="why-choose">
        <h2>Why Choose FundChainX?</h2>
        <div className="features">
          <div className="feature">
            <div className="feature-icon">🔒</div>
            <h3>Trustless System</h3>
            <p>Powered by Ethereum smart contracts.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">👀</div>
            <h3>Transparent Transactions</h3>
            <p>Every contribution is trackable.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🌍</div>
            <h3>Global Reach</h3>
            <p>Back or launch campaigns from anywhere.</p>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <h2>Backer Stories</h2>
        <div className="testimonial-slider">
          <div className="testimonial">
            <p>"FundChainX made my dream project a reality with transparent funding!"</p>
            <h4>– Sarah, Creator</h4>
          </div>
          <div className="testimonial">
            <p>"I trust FundChainX because I can see where every cent goes."</p>
            <h4>– James, Backer</h4>
          </div>
          <div className="testimonial">
            <p>"The community support on FundChainX is unmatched!"</p>
            <h4>– Priya, Creator</h4>
          </div>
        </div>
      </section>

      <section className="newsletter">
        <h2>Join Our Community</h2>
        <p>Get updates on the hottest campaigns!</p>
        <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
          <Input
            type="email"
            placeholder="Enter your email"
            required
            className="newsletter-input"
          />
          <Button type="submit">Subscribe</Button>
        </form>
        <div className="community-links">
          <a href="https://discord.com" target="_blank" rel="noopener noreferrer">Join our Discord</a>
          <a href="https://telegram.org" target="_blank" rel="noopener noreferrer">Join our Telegram</a>
          <a href="/dao" className="dao-link">Learn about FundChainX DAO</a>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
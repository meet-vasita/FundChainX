// src/components/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <p>© 2025 FundChainX. All rights reserved.</p>
      <div className="footer-links">
        <Link to="/about">About Us</Link>
        <Link to="/terms-of-service">Terms of Service</Link>
        <Link to="/contact-us">Contact Us</Link>
      </div>
    </footer>
  );
};

export default Footer;
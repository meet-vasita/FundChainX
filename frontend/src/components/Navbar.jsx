import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Button } from './common/CommonComponents';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="navbar">
      <Link to="/" className="nav-links-logo">
        <span className="logo-text">FundChainX</span>
        <span className="logo-icon">🔗</span>
      </Link>
      <div className="nav-links">
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/campaigns" className="nav-link">Explore Campaigns</Link>
        <Link to="/create" className="nav-link">Start a Campaign</Link>
        <Link to="/profile" className="nav-link">Profile</Link>
      </div>
      <div className="nav-auth">
        {user ? (
          <Button onClick={logout} className="logout-btn">Logout</Button>
        ) : (
          <Link to="/login">
            <Button className="auth-btn">Login / Signup</Button>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
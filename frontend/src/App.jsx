import React, { memo, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Campaigns from './pages/Campaigns';
import CreateCampaign from './pages/CreateCampaign';
import CampaignDetails from './pages/CampaignDetails';
import MyCampaigns from './pages/MyCampaigns';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import AboutUs from './pages/AboutUs'; // New import
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Footer from './components/Footer';
import NotificationContainer from './components/Notifications';
import { NotificationProvider } from './contexts/NotificationContext';
import { Web3Provider } from './contexts/Web3Context';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { Spinner } from './components/common/CommonComponents';

const AppContent = memo(() => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="app-container">
      {/* Show navbar on all pages except landing page */}
      {location.pathname !== '/' && <Navbar />}
      <NotificationContainer />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/create" element={user ? <CreateCampaign /> : <Navigate to="/login" />} />
          <Route path="/campaign/:address" element={<CampaignDetails />} />
          <Route path="/my-campaigns" element={user ? <MyCampaigns /> : <Navigate to="/login" />} />
          <Route path="/login" element={user ? <Navigate to="/campaigns" /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/campaigns" /> : <Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/about" element={<AboutUs />} /> {/* New route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
});

function App() {
  return (
    <AuthProvider>
      <Web3Provider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </Web3Provider>
    </AuthProvider>
  );
}

export default App;
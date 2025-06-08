import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/VerifyEmail.css';

const VerifyEmail = () => {
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [showResend, setShowResend] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const verifyEmail = useCallback(async () => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    console.log("Token extracted from URL:", token);

    if (!token) {
      console.log("No token found in URL parameters");
      setStatus('error');
      setMessage('Please check the link in your email.');
      setShowResend(true);
      return;
    }

    try {
      console.log("Sending GET request to verify email with token:", token);
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/auth/verify-email?token=${token}`, {
        timeout: 5000,
      });
      console.log("Response data:", res.data);
      setStatus('success');
      setMessage('Email verified successfully! Redirecting to login...');
      setTimeout(() => {
        console.log("Redirecting to /login");
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error("Verification error:", err.response?.data || err.message);
      setStatus('error');
      if (err.response?.status === 400 && err.response?.data?.message.includes('expired')) {
        setMessage('Verification token has expired.');
        setShowResend(true);
      } else if (err.response?.status === 400) {
        setMessage('Invalid verification token.');
        setShowResend(true);
      } else {
        setMessage('An error occurred while verifying your email. Please try again later.');
      }
    }
  }, [location, navigate]);

  const resendVerificationEmail = async () => {
    try {
      setStatus('verifying');
      setMessage('Resending verification email...');
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/resend-verification`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setStatus('success');
      setMessage('Verification email resent successfully. Please check your inbox.');
      setShowResend(false);
    } catch (err) {
      console.error("Resend verification error:", err.response?.data || err.message);
      setStatus('error');
      setMessage('Failed to resend verification email. Please try again later.');
      setShowResend(true);
    }
  };

  useEffect(() => {
    console.log("VerifyEmail component mounted");
    verifyEmail();
  }, [verifyEmail]);

  return (
    <div className="verify-email">
      <h2>Email Verification</h2>
      {status === 'verifying' && (
        <div className="loading-spinner">
          <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p>{message || 'Verifying your email...'}</p>
        </div>
      )}
      {status === 'success' && (
        <p className="text-green-600">{message}</p>
      )}
      {status === 'error' && (
        <div>
          <p className="text-red-600">{message}</p>
          {showResend && (
            <button
              onClick={resendVerificationEmail}
              className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
            >
              Resend Verification Email
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default VerifyEmail;
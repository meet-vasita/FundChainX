import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';

const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
axios.defaults.baseURL = apiBaseUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setWalletAddress(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get('/api/auth/me');
        setUser(response.data.user);
        setWalletAddress(response.data.user.walletAddress);
        setError(null);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          logout();
          setError('Session expired. Please login again.');
        } else {
          setError('Error fetching user data');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [token, logout]);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const res = await axios.post('/api/auth/login', { email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      setWalletAddress(res.data.user.walletAddress);
      localStorage.setItem('token', res.data.token);
      setError(null);
      return res.data;
    } catch (err) {
      setError(err.response?.data.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const walletLogin = async () => {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const message = `Login to FundChainX with wallet ${address}`;
      const signature = await signer.signMessage(message);

      const res = await axios.post('/api/auth/wallet-login', { walletAddress: address, signature });
      setToken(res.data.token);
      setUser(res.data.user);
      setWalletAddress(address);
      localStorage.setItem('token', res.data.token);
      setError(null);
      return res.data;
    } catch (err) {
      setError(err.response?.data.message || 'Wallet login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password) => {
    try {
      setLoading(true);
      const res = await axios.post('/api/auth/register', { email, password });
      setError(null);
      return res.data;
    } catch (err) {
      setError(err.response?.data.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    try {
      setLoading(true);
      const res = await axios.post('/api/auth/resend-verification', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setError(null);
      return res.data;
    } catch (err) {
      setError(err.response?.data.message || 'Failed to resend verification email');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, walletAddress, loading, error, login, walletLogin, logout, register, resendVerification }}
    >
      {children}
    </AuthContext.Provider>
  );
};
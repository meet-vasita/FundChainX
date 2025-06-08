import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/ResetPassword.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const resetToken = params.get('token');
    if (resetToken) {
      setToken(resetToken);
    } else {
      setError('No reset token provided');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await axios.post('/api/auth/reset-password', { token, password });
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 3000); // Redirect to login after 3 seconds
    } catch (err) {
      setError(err.response?.data.message || 'Error resetting password');
    }
  };

  return (
    <div className="reset-password">
      <h2>Reset Password</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>New Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={!token}>
          Reset Password
        </button>
      </form>
      <p>
        Back to <a href="/login">Login</a>
      </p>
    </div>
  );
};

export default ResetPassword;
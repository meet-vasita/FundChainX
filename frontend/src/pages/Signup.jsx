import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Button, Input, Alert, Spinner } from '../components/common/CommonComponents';
import '../styles/Signup.css';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Added confirm password state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]); // To store password validation errors
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  // Password validation function
  const validatePassword = (password) => {
    const errors = [];
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!hasNumber) {
      errors.push('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }

    return errors;
  };

  // Handle password input change with real-time validation
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    const errors = validatePassword(newPassword);
    setPasswordErrors(errors);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate password before proceeding
    const passwordValidationErrors = validatePassword(password);
    if (passwordValidationErrors.length > 0) {
      setError('Please fix the password errors before submitting');
      setPasswordErrors(passwordValidationErrors);
      setLoading(false);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await register(email, password);
      setSuccess('Registration successful. Please verify your email.');
      setTimeout(() => navigate('/verify-email'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup">
      <h2>Sign Up</h2>
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} />}
      {loading && <Spinner />}
      <form onSubmit={handleSubmit}>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          required
        />
        {/* Display password validation errors */}
        {passwordErrors.length > 0 && (
          <div className="password-errors">
            <ul>
              {passwordErrors.map((err, index) => (
                <li key={index} style={{ color: 'red', fontSize: '12px' }}>
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading || passwordErrors.length > 0}>
          Sign Up
        </Button>
      </form>
      <p>
        Already have an account? <a href="/login">Login</a>
      </p>
    </div>
  );
};

export default Signup;
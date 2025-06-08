import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import User from '../models/User.js';
import { sendEmail } from '../utils/email.js';

// Helper function to generate JWT token for authentication
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Helper function to generate JWT token for email verification
const generateVerificationToken = (userId) => {
  return jwt.sign({ userId, type: 'email_verification' }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

// Register a new user
export const register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const user = new User({
      email,
      password,
    });
    await user.save(); // Save the user first to get the correct _id

    const verificationToken = generateVerificationToken(user._id); // Use the actual user._id
    user.verificationToken = verificationToken;
    await user.save(); // Save again with the verification token

    console.log('User saved with token:', verificationToken);

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    console.log('Sending verification URL for', email, ':', verificationUrl);
    await sendEmail(email, 'Verify Your Email', verificationUrl, 'verification');

    res.status(201).json({ message: 'Registration successful. Please verify your email.' });
  } catch (error) {
    console.error('Registration error for', req.body.email, ':', error);
    res.status(500).json({ message: 'Error during registration', error: error.message });
  }
};

// Verify email using token
export const verifyEmail = async (req, res) => {
  try {
    const token = req.query.token || req.body.token; // Support both GET and POST
    console.log('Received verification request with token:', token);

    if (!token) {
      console.log('No token provided in verification request');
      return res.status(400).json({ message: 'No verification token provided' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({ message: 'Invalid token type' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log('No user found for token:', token);
      return res.status(400).json({ message: 'Invalid token' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    console.log('Email verified for user:', user.email);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verification error for token', req.query.token || req.body.token, ':', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Verification token has expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Invalid verification token' });
    }
    res.status(500).json({ message: 'Error verifying email', error: error.message });
  }
};

// Login with email and password
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in' });
    }

    const token = generateToken(user._id);
    res.json({
      message: 'Login successful',
      token,
      user: {
        email: user.email,
        walletAddress: user.walletAddress,
        fullName: user.fullName,
        bio: user.bio,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login', error: error.message });
  }
};

// Wallet-based login
export const walletLogin = async (req, res) => {
  try {
    const { signature, walletAddress, message } = req.body;

    // Verify the signature
    const signerAddress = ethers.verifyMessage(message, signature);
    if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    // Find or create user by wallet address
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        message: 'No account found for this wallet. Please register or link your wallet to an existing account.',
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in' });
    }

    const token = generateToken(user._id);
    res.json({
      message: 'Wallet login successful',
      token,
      user: {
        email: user.email,
        walletAddress: user.walletAddress,
        fullName: user.fullName,
        bio: user.bio,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Wallet login error:', error);
    res.status(500).json({ message: 'Error during wallet login', error: error.message });
  }
};

// Get current user details
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        email: user.email,
        walletAddress: user.walletAddress,
        fullName: user.fullName,
        bio: user.bio,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Error fetching user data', error: error.message });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email not found' });

    const resetToken = jwt.sign({ userId: user._id, type: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendEmail(email, 'Reset Your Password', resetUrl, 'reset');

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error sending reset email', error: error.message });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ message: 'Invalid token type' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.resetPasswordToken !== token || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Password reset token has expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Invalid password reset token' });
    }
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

// Link wallet to account
export const linkWallet = async (req, res) => {
  try {
    const { signature, walletAddress } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const existingWalletUser = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (existingWalletUser && existingWalletUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({ message: 'Wallet already linked to another account' });
    }

    const message = `Link wallet to FundChainX for user ${user.email}`;
    const signerAddress = ethers.verifyMessage(message, signature);
    if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    user.walletAddress = walletAddress.toLowerCase();
    await user.save();

    res.json({ message: 'Wallet linked successfully', walletAddress });
  } catch (error) {
    console.error('Link wallet error:', error);
    res.status(500).json({ message: 'Error linking wallet', error: error.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { fullName, bio } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.fullName = fullName || user.fullName;
    user.bio = bio || user.bio;
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        email: user.email,
        walletAddress: user.walletAddress,
        fullName: user.fullName,
        bio: user.bio,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

// Get email verification status
export const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ isVerified: user.isVerified });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({ message: 'Error fetching verification status', error: error.message });
  }
};

// Resend verification email
export const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });

    const verificationToken = generateVerificationToken(user._id);
    user.verificationToken = verificationToken;
    await user.save();

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendEmail(user.email, 'Verify Your Email', verificationUrl, 'verification');

    res.json({ message: 'Verification email resent successfully' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Error resending verification email', error: error.message });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Error changing password', error: error.message });
  }
};
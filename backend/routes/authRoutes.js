import express from 'express';
import * as authController from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/wallet-login', authController.walletLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Email verification routes
router.get('/verify-email', authController.verifyEmail); // For link clicks from email
router.post('/verify-email', authController.verifyEmail); // For flexibility

// Protected routes (require JWT)
router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/link-wallet', authMiddleware, authController.linkWallet);
router.put('/profile', authMiddleware, authController.updateProfile);
router.get('/verify-status', authMiddleware, authController.getVerificationStatus);
router.post('/resend-verification', authMiddleware, authController.resendVerification);
router.post('/change-password', authMiddleware, authController.changePassword);

export default router;
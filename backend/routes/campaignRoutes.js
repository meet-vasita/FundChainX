// backend/routes/campaignRoutes.js
import express from 'express';
import * as campaignController from '../controllers/campaignController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import uploadMiddleware from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', campaignController.getAllCampaigns);
router.get('/:id', campaignController.getCampaignById);
router.get('/address/:address', campaignController.getCampaignByAddress);
router.get('/creator/:creatorAddress', campaignController.getCampaignsByCreator);

// Protected routes (require JWT)
router.post('/', authMiddleware, uploadMiddleware.single('banner'), campaignController.createCampaign);
router.put('/:id', authMiddleware, uploadMiddleware.single('banner'), campaignController.updateCampaign);
router.delete('/:id', authMiddleware, campaignController.deleteCampaign);
router.post('/refund', campaignController.claimRefund);
router.post('/withdraw', authMiddleware, campaignController.withdrawFunds);

// New route for user stats
router.get('/user/stats', authMiddleware, campaignController.getUserStats);

export default router;
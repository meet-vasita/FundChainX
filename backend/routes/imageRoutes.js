import express from 'express';
import { uploadImage } from '../controllers/imageController.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Changed from 'image' to 'bannerImage' to match frontend
router.post('/upload', upload.single('bannerImage'), uploadImage);

export default router;
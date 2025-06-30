import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ✅ Simplified hardcoded CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',              // Local frontend (dev)
    'https://fundchainx-six.vercel.app'       // Deployed frontend (prod)
  ],
  credentials: true,
}));

// ✅ Handle preflight (OPTIONS) requests for all routes
app.options('*', cors());

// Middleware to parse incoming JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
import campaignRoutes from './routes/campaignRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import authRoutes from './routes/authRoutes.js';

// Route mounting
app.use('/api/campaigns', campaignRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/auth', authRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', port: PORT });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message,
  });
});

// Connect to MongoDB and start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });

export default app;

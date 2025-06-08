import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Import the User model

/**
 * Middleware to verify JWT authentication tokens
 * - Extracts token from Authorization header
 * - Verifies token validity and expiration
 * - Attaches user information to request object
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Extract token from header
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if the user still exists
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }
    
    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Account not verified' });
    }
    
    // Add user info to request object - include useful user data
    req.user = {
      userId: decoded.userId,
      email: user.email,
      walletAddress: user.walletAddress
    };
    
    // Continue to next middleware/route handler
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

export default authMiddleware;
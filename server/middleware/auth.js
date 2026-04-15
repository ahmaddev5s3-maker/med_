const jwt = require('jsonwebtoken');
const { dbAsync } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const user = await dbAsync.get(
      'SELECT user_id, full_name, email, role FROM users WHERE user_id = ?',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else {
      return res.status(500).json({ error: 'Authentication error' });
    }
  }
};

// Role-based authorization middleware
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Check if user can access patient data
const canAccessPatient = async (req, res, next) => {
  const { patientId } = req.params;
  const userId = req.user.user_id;
  const userRole = req.user.role;

  try {
    if (userRole === 'admin') {
      return next();
    }

    if (userRole === 'patient') {
      // Patients can only access their own data
      if (parseInt(patientId) !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      return next();
    }

    if (userRole === 'doctor') {
      // Check if doctor is assigned to this patient
      const assignment = await dbAsync.get(
        'SELECT * FROM doctor_patient_assignment WHERE doctor_id = ? AND patient_id = ? AND status = "active"',
        [userId, patientId]
      );

      if (!assignment) {
        return res.status(403).json({ error: 'Not authorized to access this patient data' });
      }
      return next();
    }

    res.status(403).json({ error: 'Access denied' });
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

module.exports = {
  authenticateToken,
  authorizeRole,
  canAccessPatient
};

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { dbAsync } = require('../config/database-existing');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      fullName,
      email,
      password,
      role,
      phone,
      gender,
      // Patient specific fields
      age,
      bloodType,
      weight,
      height,
      // Doctor specific fields
      medicalId,
      specialization,
      certifications,
      // Nurse specific fields
      department,
      shift,
      yearsExperience
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !password || !role || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate role
    if (!['patient', 'doctor', 'nurse'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if email already exists
    const existingUser = await dbAsync.get(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Use transaction to insert user and profile
    const queries = [];

    // Insert user
    queries.push({
      sql: 'INSERT INTO users (full_name, email, password_hash, role,phone_number) VALUES (?, ?,?, ?, ?)',
      params: [fullName, email, passwordHash, role, phone]
    });

    // Execute transaction
    const results = await dbAsync.transaction(queries);
    const userId = results[0].id;

    // Create role-specific profile
    if (role === 'patient') {
      // Calculate birth date from age (approximate)
      const birthYear = new Date().getFullYear() - parseInt(age);
      const birthDate = `${birthYear}-01-01`; // Approximate birth date

      await dbAsync.run(
        `UPDATE patient_profiles 
   SET birth_date = ?, gender = ?, blood_type = ?, chronic_diseases = ?, updated_at = ?, age = ?, weight = ?, height = ?
   WHERE user_id = ?`,
        [
          birthDate,
          gender || 'Not specified',
          bloodType || 'Unknown',
          'None',
          new Date().toISOString(),
          age || 0,
          weight || 0,
          height || 0,
          userId
        ]
      );
    } else if (role === 'doctor') {
      // Create doctor profile with gender
      try {
        await dbAsync.run(
          `UPDATE doctor_profiles 
   SET medical_id = ?, specialization = ?, certifications = ?, gender = ?
   WHERE user_id = ?`,
          [medicalId || '', specialization || '', certifications || '', gender || 'Not specified', userId]
        );
        console.log(`Doctor registered: ${fullName}, License: ${medicalId}, Specialization: ${specialization}, Gender: ${gender}`);
      } catch (error) {
        // If doctor_profiles table doesn't exist, just log the info
        console.log(`Doctor registered: ${fullName}, License: ${medicalId}, Specialization: ${specialization}, Gender: ${gender}`);
        console.log('Note: doctor_profiles table not found, gender info not stored');
      }
    } else if (role === 'nurse') {
      // Create nurse profile with new schema
      try {
        await dbAsync.run(
          `UPDATE nurse_profiles 
   SET medical_id = ?, department = ?, certifications = ?, shift = ?, years_experience = ?
   WHERE user_id = ?`,
          [medicalId || '', department || '', certifications || '', shift || '', yearsExperience || 0, userId]
        );
        console.log(`Nurse registered: ${fullName}, License: ${medicalId}, Department: ${department}, Shift: ${shift}, Years: ${yearsExperience}`);
      } catch (error) {
        // If nurse_profiles table doesn't exist, just log the info
        console.log(`Nurse registered: ${fullName}, License: ${medicalId}, Department: ${department}, Shift: ${shift}, Years: ${yearsExperience}`);
        console.log('Note: nurse_profiles table not found, profile info not stored');
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId, email, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        userId,
        fullName,
        email,
        role,
        phone
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await dbAsync.get(
      'SELECT user_id, full_name, email, password_hash, role FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        userId: user.user_id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile (simplified - no auth middleware for now)
router.get('/profile', async (req, res) => {
  try {
    // For demo purposes, return a mock profile
    res.json({
      userId: 1,
      fullName: 'Demo User',
      email: 'demo@example.com',
      role: 'patient'
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get all users organized by role
router.get('/users', async (req, res) => {
  try {
    const users = await dbAsync.query(
      'SELECT user_id, full_name, email, role FROM users ORDER BY role, full_name'
    );

    // Organize users by role
    const usersByRole = {
      patients: users.filter(user => user.role === 'patient').map(user => ({
        id: user.user_id,
        name: user.full_name,
        email: user.email
      })),
      nurses: users.filter(user => user.role === 'nurse').map(user => ({
        id: user.user_id,
        name: user.full_name,
        email: user.email
      })),
      doctors: users.filter(user => user.role === 'doctor').map(user => ({
        id: user.user_id,
        name: user.full_name,
        email: user.email
      }))
    };

    res.json(usersByRole);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;

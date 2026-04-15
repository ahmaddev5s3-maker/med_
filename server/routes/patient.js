const express = require('express');
const { dbAsync } = require('../config/database-existing');
const router = express.Router();

const resolvePatientProfile = async (patientId) => {
  const profileByUserId = await dbAsync.get(
    'SELECT profile_id, user_id FROM patient_profiles WHERE user_id = ?',
    [patientId]
  );

  if (profileByUserId) {
    return profileByUserId;
  }

  const profileByProfileId = await dbAsync.get(
    'SELECT profile_id, user_id FROM patient_profiles WHERE profile_id = ?',
    [patientId]
  );

  return profileByProfileId || null;
};

// Get patient profile
router.get('/:patientId/profile', async (req, res) => {
  try {
    const { patientId } = req.params;
    console.log('Backend: Received patientId:', patientId);
    
    if (!patientId) {
      console.error('Backend: No patientId provided');
      return res.status(400).json({ error: 'Patient ID is required' });
    }
    
    // Get user info
    const user = await dbAsync.get(
      'SELECT user_id, full_name, email, role, phone_number FROM users WHERE user_id = ?',
      [patientId]
    );
    
    console.log('Backend: User query result:', user);
    
    if (!user) {
      console.log('Backend: No user found for ID:', patientId);
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Get patient profile data
    const profile = await dbAsync.get(
      'SELECT * FROM patient_profiles WHERE user_id = ?',
      [patientId]
    );
    console.log('Backend: Profile query result:', profile);
    
    // Also check if profile exists and log all available fields
    if (profile) {
      console.log('Backend: Profile fields available:', Object.keys(profile));
      console.log('Backend: Profile data details:', {
        birth_date: profile.birth_date,
        gender: profile.gender,
        blood_type: profile.blood_type,
        chronic_diseases: profile.chronic_diseases,
        age: profile.age,
        weight: profile.weight,
        height: profile.height
      });
    } else {
      console.log('Backend: No profile found for user_id:', patientId);
      
      // Check if patient_profiles table exists and has records
      try {
        const tableCheck = await dbAsync.get('SELECT COUNT(*) as count FROM patient_profiles');
        console.log('Backend: Total records in patient_profiles:', tableCheck.count);
        
        // Get a sample record to see structure
        const sampleProfile = await dbAsync.get('SELECT * FROM patient_profiles LIMIT 1');
        if (sampleProfile) {
          console.log('Backend: Sample profile structure:', Object.keys(sampleProfile));
        }
      } catch (error) {
        console.error('Backend: Error checking patient_profiles table:', error);
      }
    }
    res.json({
      userId: user.user_id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone_number,
      role: user.role,
      profileData: profile ? {
        birthDate: profile.birth_date,
        gender: profile.gender,
        bloodType: profile.blood_type,
        chronicDiseases: profile.chronic_diseases,
        age: profile.age,
        weight: profile.weight,
        height: profile.height
      } : null
    });

  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({ error: 'Failed to fetch patient profile' });
  }
});

// Update patient profile
router.put('/:patientId/profile', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { fullName, email, phone, birthDate, gender, bloodType, chronicDiseases, age, weight, height } = req.body;
    
    console.log('Backend: Update profile request for patientId:', patientId);
    console.log('Backend: Update data received:', {
      fullName, email, phone, birthDate, gender, bloodType, 
      chronicDiseases, age, weight, height
    });
    
    // Update user info
    await dbAsync.run(
      'UPDATE users SET full_name = ?, email = ?, phone_number = ? WHERE user_id = ?',
      [fullName, email, phone, patientId]
    );
    
    // Update or insert patient profile
    const existingProfile = await dbAsync.get(
      'SELECT profile_id FROM patient_profiles WHERE user_id = ?',
      [patientId]
    );
    
    if (existingProfile) {
      await dbAsync.run(
        'UPDATE patient_profiles SET birth_date = ?, gender = ?, blood_type = ?, chronic_diseases = ?, age = ?, weight = ?, height = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [birthDate, gender, bloodType, chronicDiseases, age || 0, weight || 0, height || 0, patientId]
      );
    } else {
      await dbAsync.run(
        'INSERT INTO patient_profiles (user_id, birth_date, gender, blood_type, chronic_diseases, age, weight, height, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [patientId, birthDate, gender, bloodType, chronicDiseases, age || 0, weight || 0, height || 0]
      );
    }
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating patient profile:', error);
    res.status(500).json({ error: 'Failed to update patient profile' });
  }
});

// Get lab tests for patient
router.get('/:patientId/lab-tests', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const labTests = await dbAsync.query(
      `SELECT lr.*, u.full_name as nurse_name, n.department, n.certifications, n.shift, n.years_experience 
       FROM lab_results lr 
       LEFT JOIN users u ON lr.added_by_nurse_id = u.user_id 
       LEFT JOIN nurse_profiles n ON lr.added_by_nurse_id = n.user_id 
       WHERE lr.patient_id = ? 
       ORDER BY lr.test_date DESC`,
      [patientId]
    );
    
    res.json(labTests.map(test => ({
      resultId: test.result_id,
      patientId: test.patient_id,
      testName: test.test_name,
      testValue: test.test_value,
      unit: test.unit,
      testDate: test.test_date,
      addedByNurseId: test.added_by_nurse_id,
      department: test.department,
      certifications: test.certifications,
      shift: test.shift,
      yearsExperience: test.years_experience,
      nurseName: test.nurse_name
    })));
  } catch (error) {
    console.error('Error fetching lab tests:', error);
    res.status(500).json({ error: 'Failed to fetch lab tests' });
  }
});

// Add lab test (nurse only)
router.post('/:patientId/lab-tests', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { testName, testValue, unit } = req.body;
    
    // Check if user is nurse or admin (you should add proper auth middleware)
    const result = await dbAsync.run(
      'INSERT INTO lab_results (patient_id, test_name, test_value, unit, test_date) VALUES (?, ?, ?, ?, CURDATE())',
      [patientId, testName, testValue, unit]
    );
    
    res.json({ 
      message: 'Lab test added successfully',
      testId: result.id
    });
  } catch (error) {
    console.error('Error adding lab test:', error);
    res.status(500).json({ error: 'Failed to add lab test' });
  }
});

// Get medical notes for patient
router.get('/:patientId/notes', async (req, res) => {
  try {
    const { patientId } = req.params;

    let notes = [];
    try {
      notes = await dbAsync.query(
        `SELECT mn.*, u.full_name AS doctor_name
         FROM medical_notes mn
         LEFT JOIN users u ON mn.doctor_id = u.user_id
         WHERE mn.patient_id = ?
         ORDER BY mn.created_at DESC`,
        [patientId]
      );
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE') {
        throw error;
      }

      console.warn('medical_notes table does not exist yet, returning empty patient notes list');
    }

    res.json(notes.map(note => ({
      noteId: note.note_id,
      patientId: note.patient_id,
      content: note.note_text,
      diagnosis: note.diagnosis,
      prescription: note.prescription,
      createdBy: note.doctor_name || `Doctor #${note.doctor_id}`,
      createdAt: note.created_at,
      role: 'doctor'
    })));
  } catch (error) {
    console.error('Error fetching medical notes:', error);
    res.status(500).json({ error: 'Failed to fetch medical notes' });
  }
});

// Add medical note (doctor/nurse only)
router.post('/:patientId/notes', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { content, diagnosis, prescription } = req.body;
    const { user } = req; // This should come from auth middleware

    const tableExists = await dbAsync.get(
      `SELECT COUNT(*) AS count
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'medical_notes'`
    );

    if (!tableExists?.count) {
      return res.status(500).json({
        error: 'medical_notes table does not exist. Run the notes migration first.'
      });
    }

    const result = await dbAsync.run(
      'INSERT INTO medical_notes (patient_id, doctor_id, note_text, diagnosis, prescription) VALUES (?, ?, ?, ?, ?)',
      [patientId, user?.userId || 1, content, diagnosis || null, prescription || null]
    );

    res.json({ 
      message: 'Medical note added successfully',
      noteId: result.id
    });
  } catch (error) {
    console.error('Error adding medical note:', error);
    res.status(500).json({ error: 'Failed to add medical note' });
  }
});

// Get medical reports for patient
router.get('/:patientId/reports', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const reports = await dbAsync.query(
      'SELECT * FROM medical_reports WHERE patient_id = ? ORDER BY created_at DESC',
      [patientId]
    );
    
    res.json(reports.map(report => ({
      reportId: report.report_id,
      title: 'Medical Report', // You should add a title column to the table
      content: report.report_content,
      recommendations: 'No recommendations available', // You should add a recommendations column
      createdBy: 'Dr. Smith', // You should join with users table to get creator name
      createdAt: report.created_at
    })));
  } catch (error) {
    console.error('Error fetching medical reports:', error);
    res.status(500).json({ error: 'Failed to fetch medical reports' });
  }
});

// Get medical integrations for patient
router.get('/:patientId/integrations', async (req, res) => {
  try {
    const { patientId } = req.params;

    let integrations = [];
    try {
      integrations = await dbAsync.query(
        `SELECT mi.*, u.full_name AS doctor_name
         FROM medical_integrations mi
         LEFT JOIN users u ON mi.doctor_id = u.user_id
         WHERE mi.patient_id = ?
         ORDER BY mi.created_at DESC`,
        [patientId]
      );
    } catch (error) {
      if (error.code === 'ER_BAD_FIELD_ERROR') {
        return res.json([]);
      }

      if (error.code !== 'ER_NO_SUCH_TABLE') {
        throw error;
      }

      console.warn('medical_integrations table does not exist yet, returning empty patient integrations list');
    }

    res.json(integrations.map(integration => ({
      id: integration.integration_id,
      patientId: integration.patient_id,
      title: integration.title,
      description: integration.description,
      status: integration.status,
      patientName: integration.patient_name,
      createdBy: integration.doctor_name || `Doctor #${integration.doctor_id}`,
      createdAt: integration.created_at
    })));
  } catch (error) {
    console.error('Error fetching medical integrations:', error);
    res.status(500).json({ error: 'Failed to fetch medical integrations' });
  }
});

// Add medical report (doctor only)
router.post('/:patientId/reports', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { title, content, recommendations } = req.body;
    const { user } = req; // This should come from auth middleware
    
    // For now, use the existing medical_reports table structure
    const result = await dbAsync.run(
      'INSERT INTO medical_reports (patient_id, doctor_id, report_content) VALUES (?, ?, ?)',
      [patientId, user?.userId || 1, content]
    );
    
    res.json({ 
      message: 'Medical report added successfully',
      reportId: result.id
    });
  } catch (error) {
    console.error('Error adding medical report:', error);
    res.status(500).json({ error: 'Failed to add medical report' });
  }
});

// Get vital signs for patient
router.get('/:patientId/vitals', async (req, res) => {
  try {
    const { patientId } = req.params;
    const patientProfile = await resolvePatientProfile(patientId);

    if (!patientProfile) {
      return res.json([]);
    }

    const vitals = await dbAsync.query(
      `SELECT vs.*, pp.user_id
       FROM vitalsigns vs
       JOIN patient_profiles pp ON vs.patient_id = pp.profile_id
       WHERE vs.patient_id = ?
       ORDER BY vs.recorded_at DESC
       LIMIT 30`,
      [patientProfile.profile_id]
    );
    
    res.json(vitals.map(vital => ({
      vitalId: vital.vital_id,
      patientId: vital.user_id || patientProfile.user_id,
      temperature: vital.temperature,
      bloodPressure: vital.blood_pressure,
      heartRate: vital.heart_rate,
      respiratoryRate: vital.respiratory_rate,
      oxygenSaturation: vital.oxygen_saturation,
      weight: vital.weight,
      height: vital.height,
      recordedAt: vital.recorded_at
    })));
  } catch (error) {
    console.error('Error fetching vital signs:', error);
    res.status(500).json({ error: 'Failed to fetch vital signs' });
  }
});

module.exports = router;

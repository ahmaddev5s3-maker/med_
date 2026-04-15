const express = require('express');
const { dbAsync } = require('../config/database-existing');
const router = express.Router();

const resolvePatientProfile = async (patientId) => {
  const profileByUserId = await dbAsync.get(
    'SELECT profile_id, user_id, weight, height FROM patient_profiles WHERE user_id = ?',
    [patientId]
  );

  if (profileByUserId) {
    return profileByUserId;
  }

  const profileByProfileId = await dbAsync.get(
    'SELECT profile_id, user_id, weight, height FROM patient_profiles WHERE profile_id = ?',
    [patientId]
  );

  return profileByProfileId || null;
};

const getPatientMeasurements = async (patientId) => {
  const profile = await resolvePatientProfile(patientId);

  return {
    profileId: profile?.profile_id ?? null,
    userId: profile?.user_id ?? null,
    weight: profile?.weight ?? null,
    height: profile?.height ?? null
  };
};

// Get nurse profile
router.get('/:nurseId/profile', async (req, res) => {
  try {
    const { nurseId } = req.params;
    console.log('Backend: Received nurseId:', nurseId);
    
    if (!nurseId) {
      console.error('Backend: No nurseId provided');
      return res.status(400).json({ error: 'Nurse ID is required' });
    }
    
    // Get user info
    const user = await dbAsync.get(
      'SELECT user_id, full_name, email, role, phone_number FROM users WHERE user_id = ?',
      [nurseId]
    );
    
    console.log('Backend: User query result:', user);
    
    if (!user) {
      console.log('Backend: No user found for ID:', nurseId);
      return res.status(404).json({ error: 'Nurse not found' });
    }
    
    // Get nurse profile data
    const profile = await dbAsync.get(
      'SELECT * FROM nurse_profiles WHERE user_id = ?',
      [nurseId]
    );
    console.log('Backend: Nurse profile query result:', profile);
    
    // Get lab results added by this nurse
    const labResults = await dbAsync.query(
      'SELECT * FROM lab_results WHERE added_by_nurse_id = ? ORDER BY test_date DESC',
      [nurseId]
    );
    console.log('Backend: Lab results for nurse:', labResults);
    
    res.json({
      userId: user.user_id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone_number,
      role: user.role,
      profileData: profile ? {
        medicalId: profile.medical_id,
        department: profile.department,
        certifications: profile.certifications,
        shift: profile.shift,
        yearsExperience: profile.years_experience
      } : null,
      labResults: labResults.map(result => ({
        resultId: result.result_id,
        patientId: result.patient_id,
        testName: result.test_name,
        testValue: result.test_value,
        unit: result.unit,
        testDate: result.test_date
      }))
    });

  } catch (error) {
    console.error('Error fetching nurse profile:', error);
    res.status(500).json({ error: 'Failed to fetch nurse profile' });
  }
});

// Update nurse profile
router.put('/:nurseId/profile', async (req, res) => {
  try {
    const { nurseId } = req.params;
    const { fullName, email, phone, medicalId, department, certifications, shift, yearsExperience } = req.body;
    
    console.log('Backend: Update nurse profile request for nurseId:', nurseId);
    console.log('Backend: Update data received:', {
      fullName, email, phone, medicalId, department, certifications, shift, yearsExperience
    });
    
    // Update user info
    await dbAsync.run(
      'UPDATE users SET full_name = ?, email = ?, phone_number = ? WHERE user_id = ?',
      [fullName, email, phone, nurseId]
    );
    
    // Update or insert nurse profile
    const existingProfile = await dbAsync.get(
      'SELECT nurse_id FROM nurse_profiles WHERE user_id = ?',
      [nurseId]
    );
    
    if (existingProfile) {
      await dbAsync.run(
        'UPDATE nurse_profiles SET medical_id = ?, department = ?, certifications = ?, shift = ?, years_experience = ?, created_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [medicalId || '', department || '', certifications || '', shift || '', yearsExperience || 0, nurseId]
      );
    } else {
      await dbAsync.run(
        'INSERT INTO nurse_profiles (user_id, medical_id, department, certifications, shift, years_experience, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [nurseId, medicalId || '', department || '', certifications || '', shift || '', yearsExperience || 0]
      );
    }
    
    res.json({ message: 'Nurse profile updated successfully' });
  } catch (error) {
    console.error('Error updating nurse profile:', error);
    res.status(500).json({ error: 'Failed to update nurse profile' });
  }
});

// Add lab result
router.post('/:nurseId/lab-results', async (req, res) => {
  try {
    const { nurseId } = req.params;
    const { patientId, testName, testValue, unit, testDate } = req.body;
    
    console.log('Backend: Add lab result for nurseId:', nurseId);
    console.log('Backend: Lab result data:', { patientId, testName, testValue, unit, testDate });
    
    await dbAsync.run(
      'INSERT INTO lab_results (patient_id, test_name, test_value, unit, test_date, added_by_nurse_id) VALUES (?, ?, ?, ?, ?, ?)',
      [patientId, testName, testValue, unit, testDate || new Date().toISOString().split('T')[0], nurseId]
    );
    
    res.json({ message: 'Lab result added successfully' });
  } catch (error) {
    console.error('Error adding lab result:', error);
    res.status(500).json({ error: 'Failed to add lab result' });
  }
});

// Add vital signs
router.post('/:nurseId/vitalsigns', async (req, res) => {
  try {
    const { nurseId } = req.params;
    const {
      patientId,
      temperature,
      bloodPressure,
      heartRate,
      respiratoryRate,
      oxygenSaturation,
      weight,
      height,
      recordedAt
    } = req.body;

    if (!patientId || !bloodPressure) {
      return res.status(400).json({ error: 'patientId and bloodPressure are required' });
    }

    const patientMeasurements = await getPatientMeasurements(patientId);
    if (!patientMeasurements.profileId) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    const result = await dbAsync.run(
      `INSERT INTO vitalsigns
       (patient_id, temperature, blood_pressure, heart_rate, respiratory_rate, oxygen_saturation, weight, height, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientMeasurements.profileId,
        temperature || null,
        bloodPressure,
        heartRate || null,
        respiratoryRate || null,
        oxygenSaturation || null,
        weight || patientMeasurements.weight,
        height || patientMeasurements.height,
        recordedAt || new Date().toISOString().slice(0, 19).replace('T', ' ')
      ]
    );

    res.json({
      message: 'Vital signs added successfully',
      vitalId: result.id
    });
  } catch (error) {
    console.error('Error adding vital signs:', error);
    res.status(500).json({ error: 'Failed to add vital signs' });
  }
});

// Update vital signs
router.put('/:nurseId/vitalsigns/:vitalId', async (req, res) => {
  try {
    const { vitalId } = req.params;
    const {
      temperature,
      bloodPressure,
      heartRate,
      respiratoryRate,
      oxygenSaturation,
      weight,
      height,
      recordedAt
    } = req.body;

    const existingVital = await dbAsync.get(
      'SELECT patient_id, recorded_at FROM vitalsigns WHERE vital_id = ?',
      [vitalId]
    );

    if (!existingVital) {
      return res.status(404).json({ error: 'Vital signs record not found' });
    }

    const patientMeasurements = await getPatientMeasurements(existingVital.patient_id);
    if (!patientMeasurements.profileId) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    await dbAsync.run(
      `UPDATE vitalsigns
       SET temperature = ?, blood_pressure = ?, heart_rate = ?, respiratory_rate = ?, oxygen_saturation = ?, weight = ?, height = ?, recorded_at = ?
       WHERE vital_id = ?`,
      [
        temperature || null,
        bloodPressure,
        heartRate || null,
        respiratoryRate || null,
        oxygenSaturation || null,
        weight || patientMeasurements.weight,
        height || patientMeasurements.height,
        recordedAt || existingVital.recorded_at || new Date().toISOString().slice(0, 19).replace('T', ' '),
        vitalId
      ]
    );

    res.json({ message: 'Vital signs updated successfully' });
  } catch (error) {
    console.error('Error updating vital signs:', error);
    res.status(500).json({ error: 'Failed to update vital signs' });
  }
});

// Update lab result
router.put('/:nurseId/lab-results/:resultId', async (req, res) => {
  try {
    const { nurseId, resultId } = req.params;
    const { testName, testValue, unit, testDate } = req.body;
    
    console.log('Backend: Update lab result for nurseId:', nurseId, 'resultId:', resultId);
    console.log('Backend: Updated data:', { testName, testValue, unit, testDate });
    
    // Verify this lab result belongs to this nurse
    const labResult = await dbAsync.get(
      'SELECT * FROM lab_results WHERE result_id = ? AND added_by_nurse_id = ?',
      [resultId, nurseId]
    );
    
    if (!labResult) {
      return res.status(404).json({ error: 'Lab result not found or access denied' });
    }
    
    await dbAsync.run(
      'UPDATE lab_results SET test_name = ?, test_value = ?, unit = ?, test_date = ? WHERE result_id = ?',
      [testName, testValue, unit, testDate, resultId]
    );
    
    res.json({ message: 'Lab result updated successfully' });
  } catch (error) {
    console.error('Error updating lab result:', error);
    res.status(500).json({ error: 'Failed to update lab result' });
  }
});

// Delete lab result
router.delete('/:nurseId/lab-results/:resultId', async (req, res) => {
  try {
    const { nurseId, resultId } = req.params;
    
    console.log('Backend: Delete lab result for nurseId:', nurseId, 'resultId:', resultId);
    
    // Verify this lab result belongs to this nurse
    const labResult = await dbAsync.get(
      'SELECT * FROM lab_results WHERE result_id = ? AND added_by_nurse_id = ?',
      [resultId, nurseId]
    );
    
    if (!labResult) {
      return res.status(404).json({ error: 'Lab result not found or access denied' });
    }
    
    await dbAsync.run(
      'DELETE FROM lab_results WHERE result_id = ?',
      [resultId]
    );
    
    res.json({ message: 'Lab result deleted successfully' });
  } catch (error) {
    console.error('Error deleting lab result:', error);
    res.status(500).json({ error: 'Failed to delete lab result' });
  }
});

module.exports = router;

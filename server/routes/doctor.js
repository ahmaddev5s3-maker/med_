const express = require('express');
const { dbAsync } = require('../config/database-existing');
const router = express.Router();

// Get doctor profile
router.get('/:doctorId/profile', async (req, res) => {
  try {
    const { doctorId } = req.params;
    console.log('Backend: Received doctorId:', doctorId);
    
    if (!doctorId) {
      console.error('Backend: No doctorId provided');
      return res.status(400).json({ error: 'Doctor ID is required' });
    }
    
    // Get user info
    const user = await dbAsync.get(
      'SELECT user_id, full_name, email, role, phone_number FROM users WHERE user_id = ?',
      [doctorId]
    );
    
    console.log('Backend: User query result:', user);
    
    if (!user) {
      console.log('Backend: No user found for ID:', doctorId);
      return res.status(404).json({ error: 'Doctor not found' });
    }
    
    // Get doctor profile data
    const profile = await dbAsync.get(
      'SELECT medical_id, specialization, certifications, gender FROM doctor_profiles WHERE user_id = ?',
      [doctorId]
    );
    
    console.log('Backend: Profile query result:', profile);
    
    // Get patient count
    const patientCountResult = await dbAsync.get(
      'SELECT COUNT(*) as count FROM doctor_patient_assignment WHERE doctor_id = ? AND status = "active"',
      [doctorId]
    );
    
    // Get upcoming deadlines (mock data for now - you can create a deadlines table later)
    const upcomingDeadlines = await dbAsync.query(`
      SELECT 
        1 as id,
        'Patient Follow-up' as title,
        DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY) as date,
        'Medical Review' as type
      UNION ALL
      SELECT 
        2 as id,
        'Report Submission' as title,
        DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY) as date,
        'Administrative' as type
      ORDER BY date ASC
    `);
    
    // Get medical reports
    const medicalReports = await dbAsync.query(
      `SELECT mr.*, u.full_name AS doctor_name
       FROM medical_reports mr
       LEFT JOIN users u ON mr.doctor_id = u.user_id
       WHERE mr.doctor_id = ?
       ORDER BY mr.created_at DESC`,
      [doctorId]
    );
    
    // Get patient assignments
    const patientAssignments = await dbAsync.query(`
      SELECT dpa.*, u.full_name as patient_name 
      FROM doctor_patient_assignment dpa 
      JOIN users u ON dpa.patient_id = u.user_id 
      WHERE dpa.doctor_id = ? 
      ORDER BY dpa.assignment_id DESC`,
      [doctorId]
    );
    
    const response = {
      userId: user.user_id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone_number,
      role: user.role,
      profileData: profile ? {
        medicalId: profile.medical_id,
        specialization: profile.specialization,
        certifications: profile.certifications,
        gender: profile.gender
      } : {},
      patientCount: patientCountResult ? patientCountResult.count : 0,
      upcomingDeadlines: upcomingDeadlines.map(deadline => ({
        id: deadline.id,
        title: deadline.title,
        date: deadline.date,
        type: deadline.type
      })),
      medicalReports: medicalReports.map(report => ({
        reportId: report.report_id,
        title: 'Medical Report',
        content: report.report_content,
        recommendations: '',
        createdBy: report.doctor_name || user.full_name,
        createdAt: report.created_at
      })),
      patientAssignments: patientAssignments.map(assignment => ({
        assignmentId: assignment.assignment_id,
        patientId: assignment.patient_id,
        patientName: assignment.patient_name,
        assignedDate: assignment.assigned_date || null,
        status: assignment.status
      }))
    };
    
    console.log('Backend: Sending doctor profile response');
    res.json(response);
  } catch (error) {
    console.error('Backend: Error fetching doctor profile:', error);
    res.status(500).json({ error: 'Failed to fetch doctor profile' });
  }
});

// Update doctor profile
router.put('/:doctorId/profile', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { fullName, email, phone, medicalId, specialization, certifications, gender } = req.body;
    
    console.log('Backend: Updating doctor profile for ID:', doctorId);
    
    // Update user info
    await dbAsync.run(
      'UPDATE users SET full_name = ?, email = ?, phone_number = ? WHERE user_id = ?',
      [fullName, email, phone, doctorId]
    );
    
    // Update doctor profile
    const existingProfile = await dbAsync.get(
      'SELECT profile_id FROM doctor_profiles WHERE user_id = ?',
      [doctorId]
    );
    
    if (existingProfile) {
      await dbAsync.run(
        'UPDATE doctor_profiles SET medical_id = ?, specialization = ?, certifications = ?, gender = ? WHERE user_id = ?',
        [medicalId || '', specialization || '', certifications || '', gender || 'Not specified', doctorId]
      );
    } else {
      await dbAsync.run(
        'INSERT INTO doctor_profiles (user_id, medical_id, specialization, certifications, gender) VALUES (?, ?, ?, ?, ?)',
        [doctorId, medicalId || '', specialization || '', certifications || '', gender || 'Not specified']
      );
    }
    
    console.log('Backend: Doctor profile updated successfully');
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Backend: Error updating doctor profile:', error);
    res.status(500).json({ error: 'Failed to update doctor profile' });
  }
});

// Get medical notes for doctor
router.get('/:doctorId/notes', async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    let notes = [];
    try {
      notes = await dbAsync.query(
        `SELECT mn.*, p.full_name AS patient_name, d.full_name AS doctor_name
         FROM medical_notes mn
         LEFT JOIN users p ON mn.patient_id = p.user_id
         LEFT JOIN users d ON mn.doctor_id = d.user_id
         WHERE mn.doctor_id = ?
         ORDER BY mn.created_at DESC`,
        [doctorId]
      );
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE') {
        throw error;
      }

      console.warn('medical_notes table does not exist yet, returning empty notes list');
    }
    
    res.json(notes.map(note => ({
      noteId: note.note_id,
      patientId: note.patient_id,
      patientName: note.patient_name,
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

// Add medical note
router.post('/:doctorId/notes', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { content, diagnosis, prescription, patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }
    
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
      [patientId, doctorId, content, diagnosis || null, prescription || null]
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

// Get medical reports for doctor
router.get('/:doctorId/reports', async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const reports = await dbAsync.query(
      `SELECT mr.*, u.full_name AS doctor_name
       FROM medical_reports mr
       LEFT JOIN users u ON mr.doctor_id = u.user_id
       WHERE mr.doctor_id = ?
       ORDER BY mr.created_at DESC`,
      [doctorId]
    );
    
    res.json(reports.map(report => ({
      reportId: report.report_id,
      title: 'Medical Report',
      content: report.report_content,
      recommendations: '',
      createdBy: report.doctor_name || `Doctor #${doctorId}`,
      createdAt: report.created_at
    })));
  } catch (error) {
    console.error('Error fetching medical reports:', error);
    res.status(500).json({ error: 'Failed to fetch medical reports' });
  }
});

// Add medical report
router.post('/:doctorId/reports', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { title, content, recommendations } = req.body;
    
    const finalContent = [title, content, recommendations]
      .filter((value) => typeof value === 'string' && value.trim())
      .join('\n\n');

    const result = await dbAsync.run(
      'INSERT INTO medical_reports (patient_id, doctor_id, report_content) VALUES (?, ?, ?)',
      [req.body.patientId || null, doctorId, finalContent || content || '']
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

// Get patient assignments for doctor
router.get('/:doctorId/patients', async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const assignments = await dbAsync.query(`
      SELECT dpa.*, u.full_name as patient_name 
      FROM doctor_patient_assignment dpa 
      JOIN users u ON dpa.patient_id = u.user_id 
      WHERE dpa.doctor_id = ? 
      ORDER BY dpa.assignment_id DESC`,
      [doctorId]
    );
    
    res.json(assignments.map(assignment => ({
      assignmentId: assignment.assignment_id,
      patientId: assignment.patient_id,
      patientName: assignment.patient_name,
      assignedDate: assignment.assigned_date || null,
      status: assignment.status
    })));
  } catch (error) {
    console.error('Error fetching patient assignments:', error);
    res.status(500).json({ error: 'Failed to fetch patient assignments' });
  }
});

// Assign patient to doctor
router.post('/:doctorId/patients', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { patientId, status } = req.body;
    
    const result = await dbAsync.run(
      'INSERT INTO doctor_patient_assignment (doctor_id, patient_id, status) VALUES (?, ?, ?)',
      [doctorId, patientId, status || 'active']
    );
    
    res.json({ 
      message: 'Patient assigned successfully',
      assignmentId: result.id
    });
  } catch (error) {
    console.error('Error assigning patient:', error);
    res.status(500).json({ error: 'Failed to assign patient' });
  }
});

// Get medical integrations for doctor
router.get('/:doctorId/integrations', async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    let integrations = [];
    try {
      integrations = await dbAsync.query(
        `SELECT mi.*, u.full_name AS patient_name
         FROM medical_integrations mi
         LEFT JOIN users u ON mi.patient_id = u.user_id
         WHERE mi.doctor_id = ?
         ORDER BY mi.created_at DESC`,
        [doctorId]
      );
    } catch (error) {
      if (error.code !== 'ER_BAD_FIELD_ERROR') {
        throw error;
      }

      integrations = await dbAsync.query(
        `SELECT mi.*
         FROM medical_integrations mi
         WHERE mi.doctor_id = ?
         ORDER BY mi.created_at DESC`,
        [doctorId]
      );
    }
    
    res.json(integrations.map(integration => ({
      id: integration.integration_id,
      patientId: integration.patient_id || null,
      title: integration.title,
      description: integration.description,
      status: integration.status,
      patientName: integration.patient_name || null,
      createdAt: integration.created_at
    })));
  } catch (error) {
    console.error('Error fetching medical integrations:', error);
    res.status(500).json({ error: 'Failed to fetch medical integrations' });
  }
});

// Add medical integration
router.post('/:doctorId/integrations', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { title, description, patientId, patientName, status } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    const patientIdColumnExists = await dbAsync.get(
      `SELECT COUNT(*) AS count
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'medical_integrations'
         AND column_name = 'patient_id'`
    );

    if (!patientIdColumnExists?.count) {
      return res.status(500).json({
        error: 'medical_integrations.patient_id does not exist. Run the integrations migration first.'
      });
    }
    
    const result = await dbAsync.run(
      'INSERT INTO medical_integrations (doctor_id, patient_id, title, description, patient_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [doctorId, patientId, title, description, patientName || null, status || 'pending']
    );
    
    res.json({ 
      message: 'Medical integration added successfully',
      id: result.id
    });
  } catch (error) {
    console.error('Error adding medical integration:', error);
    res.status(500).json({ error: 'Failed to add medical integration' });
  }
});

module.exports = router;

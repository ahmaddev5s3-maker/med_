const { dbAsync } = require('./config/database-existing');

async function createMedicalIntegrationsTable() {
  try {
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS medical_integrations (
        integration_id INT AUTO_INCREMENT PRIMARY KEY,
        doctor_id INT NOT NULL,
        patient_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        patient_name VARCHAR(255),
        status ENUM('pending', 'in-progress', 'completed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doctor_id) REFERENCES users(user_id),
        FOREIGN KEY (patient_id) REFERENCES users(user_id)
      )
    `);
    console.log('Medical integrations table created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  }
  process.exit(0);
}

createMedicalIntegrationsTable();

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { dbAsync, testConnection, checkTables } = require('./config/database-existing');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Check if required tables exist
    const tablesOk = await checkTables();
    if (!tablesOk) {
      console.error('Required tables are missing. Please check your database schema.');
      process.exit(1);
    }

    // Routes
    app.use('/api/auth', require('./routes/auth-mysql'));
    app.use('/api/patient', require('./routes/patient'));
    app.use('/api/nurse', require('./routes/nurse'));
    app.use('/api/doctor', require('./routes/doctor'));

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', message: 'MedTrack API is running with existing MySQL database' });
    });

    // Simple test endpoints for development
    app.get('/api/test/users', async (req, res) => {
      try {
        const users = await dbAsync.query('SELECT user_id, full_name, email, role FROM users');
        res.json(users);
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
      }
    });

    app.get('/api/test/patients', async (req, res) => {
      try {
        const patients = await dbAsync.query(`
          SELECT 
            u.user_id,
            u.full_name,
            u.email,
            u.created_at,
            pp.birth_date,
            pp.gender,
            pp.blood_type,
            pp.chronic_diseases
          FROM users u
          LEFT JOIN patient_profiles pp ON u.user_id = pp.user_id
          WHERE u.role = 'patient'
          ORDER BY u.created_at DESC
        `);
        res.json(patients);
      } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ error: 'Failed to fetch patients' });
      }
    });

    // Test table structure
    app.get('/api/test/tables', async (req, res) => {
      try {
        const [tables] = await dbAsync.query('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);
        res.json({ tables: tableNames });
      } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({ error: 'Failed to fetch tables' });
      }
    });

    // Test specific table structure
    app.get('/api/test/table/:tableName', async (req, res) => {
      try {
        const { tableName } = req.params;
        const [columns] = await dbAsync.query(`DESCRIBE ${tableName}`);
        res.json({ table: tableName, columns });
      } catch (error) {
        console.error('Error fetching table structure:', error);
        res.status(500).json({ error: 'Failed to fetch table structure' });
      }
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: 'Something went wrong!' });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Start server
    app.listen(PORT, () => {
      // console.log(`Server is running on port ${PORT}`);
      console.log(`Health check available at: http://localhost:${PORT}/api/health`);
      // console.log(`Test endpoints:`);
      // console.log(`  GET /api/test/users - Get all users`);
      // console.log(`  GET /api/test/patients - Get all patients`);
      // console.log(`  GET /api/test/tables - List all tables`);
      // console.log(`  GET /api/test/table/:tableName - Show table structure`);
      // console.log(`  POST /api/auth/register - Register new user`);
      // console.log(`  POST /api/auth/login - User login`);
      // console.log(`\nDatabase: Existing MySQL (${process.env.DB_NAME})`);
      // console.log(`\nReady to connect to your existing med_tt database!`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;

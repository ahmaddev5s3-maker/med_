const mysql = require('mysql2/promise');

// MySQL connection configuration for existing database
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  // password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'med_tt',
  charset: 'utf8mb4'
};

// Create connection pool
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to existing MySQL database successfully!');
    console.log(`Database: ${dbConfig.database}`);
    console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
    
    // Test a simple query to verify connection
    const [rows] = await connection.execute('SHOW TABLES');
    console.log(`Found ${rows.length} tables in database`);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('Error connecting to MySQL database:', error.message);
    return false;
  }
}

// Database query helper functions
const dbAsync = {
  // Execute a query and return results
  query: async (sql, params = []) => {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  // Execute a query and return the first result
  get: async (sql, params = []) => {
    try {
      const rows = await dbAsync.query(sql, params);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Database get error:', error);
      throw error;
    }
  },

  // Execute an INSERT query and return the insert ID
  run: async (sql, params = []) => {
    try {
      const [result] = await pool.execute(sql, params);
      return {
        id: result.insertId,
        changes: result.affectedRows
      };
    } catch (error) {
      console.error('Database run error:', error);
      throw error;
    }
  },

  // Execute multiple queries in a transaction
  transaction: async (queries) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const results = [];
      for (const { sql, params } of queries) {
        const [result] = await connection.execute(sql, params);
        results.push({
          id: result.insertId,
          changes: result.affectedRows,
          rows: result
        });
      }
      
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      console.error('Transaction error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
};

// Check if required tables exist
async function checkTables() {
  try {
    console.log('Checking existing tables...');
    
    // List of expected tables based on the schema
    const expectedTables = [
      'users',
      'patient_profiles', 
      'lab_results',
      'medical_reports',
      'vitalsigns',
      'doctor_patient_assignment'
    ];
    
    const [existingTables] = await pool.execute('SHOW TABLES');
    const tableNames = existingTables.map(row => Object.values(row)[0]);
    
    console.log('Existing tables:', tableNames);
    
    const missingTables = expectedTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.log('Missing tables:', missingTables);
      console.log('Please ensure all required tables exist in your med_tt database');
      return false;
    } else {
      console.log('All required tables found!');
      return true;
    }
  } catch (error) {
    console.error('Error checking tables:', error);
    return false;
  }
}

module.exports = {
  pool,
  dbAsync,
  testConnection,
  checkTables
};

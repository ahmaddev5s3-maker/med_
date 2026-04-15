# Connect to Existing med_tt Database

## Overview
This guide shows how to connect the MedTrack backend to your existing phpMyAdmin database "med_tt" with the tables and attributes from "database for med.txt".

## Prerequisites
- Existing MySQL database named "med_tt" in phpMyAdmin
- Tables should already be created according to the schema
- Node.js and npm installed

## Step 1: Update Database Configuration

Edit the `.env` file in the server folder:

```env
# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=med_tt
```

**Important:** Replace `your_actual_mysql_password` with your actual MySQL password.

## Step 2: Verify Database Structure

Make sure your med_tt database has these tables (from database for med.txt):

1. **users** - User accounts
   - user_id (PRIMARY KEY)
   - full_name (VARCHAR)
   - email (VARCHAR UNIQUE)
   - password_hash (TEXT)
   - role (VARCHAR: 'doctor', 'patient', 'admin')
   - created_at (TIMESTAMP)

2. **patient_profiles** - Patient information
   - profile_id (PRIMARY KEY)
   - user_id (FOREIGN KEY)
   - birth_date (DATE)
   - gender (VARCHAR)
   - blood_type (VARCHAR)
   - chronic_diseases (TEXT)
   - updated_at (TIMESTAMP)

3. **lab_results** - Lab test results
   - result_id (PRIMARY KEY)
   - patient_id (FOREIGN KEY)
   - test_name (VARCHAR)
   - test_value (NUMERIC)
   - unit (VARCHAR)
   - test_date (DATE)

4. **medical_reports** - Medical reports
   - report_id (PRIMARY KEY)
   - patient_id (FOREIGN KEY)
   - doctor_id (FOREIGN KEY)
   - report_content (TEXT)
   - encryption_key_id (VARCHAR)
   - created_at (TIMESTAMP)

5. **vital_signs** - Vital signs measurements
   - sign_id (PRIMARY KEY)
   - patient_id (FOREIGN KEY)
   - blood_pressure_sys (INT)
   - blood_pressure_dia (INT)
   - heart_rate (INT)
   - blood_sugar (NUMERIC)
   - oxygen_level (INT)
   - measured_at (TIMESTAMP)

6. **doctor_patient_assignment** - Doctor-patient relationships
   - assignment_id (PRIMARY KEY)
   - doctor_id (FOREIGN KEY)
   - patient_id (FOREIGN KEY)
   - assigned_at (TIMESTAMP)
   - status (VARCHAR)
   - UNIQUE(doctor_id, patient_id)

## Step 3: Start the Server

```bash
cd server
npm run dev
```

The server will:
1. Connect to your existing med_tt database
2. Check if all required tables exist
3. Start the API server on port 5000

## Step 4: Test the Connection

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Check Tables
```bash
curl http://localhost:5000/api/test/tables
```

### Check Specific Table Structure
```bash
curl http://localhost:5000/api/test/table/users
```

### Test Users
```bash
curl http://localhost:5000/api/test/users
```

### Test Patients
```bash
curl http://localhost:5000/api/test/patients
```

## Step 5: Connect Frontend

1. **Start Frontend:**
   ```bash
   cd client
   npm run dev
   ```

2. **Test Registration:**
   - Go to http://localhost:3000/register
   - Fill the registration form
   - Data will be saved to your existing med_tt database

3. **Test Login:**
   - Go to http://localhost:3000/login
   - Use registered credentials

## Troubleshooting

### Connection Issues

1. **"Access denied for user"**
   - Check DB_USER and DB_PASSWORD in .env
   - Verify MySQL user has permissions for med_tt database

2. **"Unknown database"**
   - Make sure med_tt database exists in phpMyAdmin
   - Check spelling in DB_NAME

3. **"Table doesn't exist"**
   - Verify all required tables are created in med_tt
   - Check table names match exactly

### Check Database Status

Run this command to check database status:
```bash
npm run setup
```

This will:
- Test database connection
- List existing tables
- Show missing tables (if any)

### Common Issues

1. **Port conflicts:**
   - Make sure port 5000 is not in use
   - Stop any other running servers

2. **MySQL not running:**
   - Start MySQL service
   - Check if phpMyAdmin is accessible

3. **Wrong credentials:**
   - Double-check MySQL username and password
   - Try connecting with phpMyAdmin first

## Available Commands

```bash
# Start development server
npm run dev

# Start production server
npm start

# Check database setup
npm run setup

# Alternative options
npm run dev:mysql    # Use MySQL with table creation
npm run dev:sqlite   # Use SQLite
```

## API Endpoints

Once connected, these endpoints will work with your existing data:

- `POST /api/auth/register` - Register new users
- `POST /api/auth/login` - User authentication
- `GET /api/test/users` - List all users
- `GET /api/test/patients` - List all patients
- `GET /api/test/tables` - List all tables
- `GET /api/test/table/:name` - Show table structure

## Data Flow

```
Frontend Registration Form
    -> API Service (axios)
    -> Backend Server (Express)
    -> Existing med_tt Database
    -> Response back to Frontend
```

## Security Notes

- Keep your MySQL password secure
- Use strong passwords for user accounts
- Consider using environment variables for production
- Enable SSL for database connections in production

Your existing med_tt database is now connected to the MedTrack backend! The system will use your existing tables and data structure.

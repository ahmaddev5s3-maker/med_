# MedTrack Server - Clean Version

## Overview
Clean, simplified server that connects to your existing `med_tt` database in phpMyAdmin.

## Project Structure
```
server/
|
|__ .env                    # Environment variables
|__ index.js               # Main server file
|__ package.json           # Dependencies and scripts
|__ package-lock.json      # Lock file
|__ node_modules/          # Dependencies
|__ config/
|   |__ database-existing.js  # MySQL connection for existing database
|__ routes/
|   |__ auth-mysql.js         # Authentication routes
|__ README-CLEAN.md       # This file
|__ EXISTING-DB-SETUP.md # Setup guide
|__ README.md             # Original documentation
```

## What Was Removed (Unused Files)
- All SQLite database files and configurations
- Multiple index files (index-final.js, index-mysql.js, index-simple.js, etc.)
- Unused route files (doctors.js, patients.js, vitalSigns.js, medicalReports.js)
- Middleware files (not needed for basic auth)
- Setup scripts and documentation
- Database folder and files

## What Remains (Essential Files Only)

### Core Files
- **index.js** - Main server with health check and test endpoints
- **package.json** - Simplified scripts for start/dev
- **.env** - Database configuration for med_tt

### Database Connection
- **config/database-existing.js** - Connects to your existing med_tt database
- **routes/auth-mysql.js** - Registration and login endpoints

## Quick Start

1. **Update MySQL Password:**
   ```env
   DB_PASSWORD=your_actual_mysql_password
   ```

2. **Start Server:**
   ```bash
   npm start    # Production
   npm run dev  # Development
   ```

3. **Test Connection:**
   - Health: `http://localhost:5000/api/health`
   - Tables: `http://localhost:5000/api/test/tables`
   - Users: `http://localhost:5000/api/test/users`

## Available Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (patient/doctor)
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Testing
- `GET /api/health` - Server health check
- `GET /api/test/users` - List all users
- `GET /api/test/patients` - List all patients
- `GET /api/test/tables` - List database tables
- `GET /api/test/table/:name` - Show table structure

## Database Requirements

Your `med_tt` database should have these tables:
- `users` - User accounts
- `patient_profiles` - Patient information
- `lab_results` - Lab test results
- `medical_reports` - Medical reports
- `vital_signs` - Vital signs
- `doctor_patient_assignment` - Doctor-patient relationships

## Features

### Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Role-based registration (patient/doctor)
- Token-based API access

### Database
- Connection pooling for performance
- Error handling and logging
- Table verification on startup
- Support for existing database schema

### API
- RESTful endpoints
- JSON responses
- CORS enabled
- Comprehensive error handling

## Frontend Integration

The frontend can now connect to this clean backend:

1. **Registration:** Users register as patient or doctor
2. **Login:** JWT token authentication
3. **Data Storage:** All data saved to your existing med_tt database
4. **API Calls:** Full CRUD operations on user data

## Security Features

- Password encryption with bcrypt
- JWT token authentication
- Environment variable configuration
- Input validation
- SQL injection prevention

## Development

### Adding New Endpoints
1. Create new route files in `routes/`
2. Import and use in `index.js`
3. Follow the same pattern as `auth-mysql.js`

### Database Operations
Use the provided `dbAsync` helper functions:
- `dbAsync.query()` - Execute any query
- `dbAsync.get()` - Get single record
- `dbAsync.run()` - Insert/Update/Delete
- `dbAsync.transaction()` - Multiple queries

### Environment Variables
```env
PORT=5000
JWT_SECRET=your-secret-key
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=med_tt
CLIENT_URL=http://localhost:3000
```

## Production Deployment

1. Update environment variables
2. Use HTTPS
3. Set up proper database security
4. Configure reverse proxy (nginx)
5. Set up process manager (PM2)

## Troubleshooting

### Connection Issues
- Check MySQL credentials in .env
- Verify med_tt database exists
- Ensure MySQL service is running

### Table Issues
- Run `GET /api/test/tables` to check existing tables
- Verify table names match schema
- Check table structure with `GET /api/test/table/:name`

### Registration Issues
- Check if email already exists
- Verify all required fields are filled
- Check database constraints

This clean version provides everything needed to connect your frontend to the existing med_tt database with minimal complexity.

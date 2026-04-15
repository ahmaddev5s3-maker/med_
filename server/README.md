# MedTrack Backend Server

Node.js backend API for the MedTrack medical tracking application.

## Features

- **Authentication**: JWT-based authentication for doctors and patients
- **Role-based Authorization**: Different access levels for doctors, patients, and admins
- **Patient Management**: CRUD operations for patient profiles and data
- **Doctor Management**: Patient assignments and doctor-patient relationships
- **Vital Signs Tracking**: Record and retrieve patient vital signs with charting support
- **Medical Reports**: Encrypted medical report storage and retrieval
- **SQLite Database**: Lightweight database with schema from `database for med.txt`

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:
```
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on `http://localhost:5000` by default.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (patient or doctor)
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/password` - Update password

### Patients
- `GET /api/patients` - Get all patients (doctors/admins only)
- `GET /api/patients/:patientId` - Get patient by ID
- `PUT /api/patients/:patientId` - Update patient profile
- `GET /api/patients/:patientId/vital-signs` - Get patient vital signs
- `GET /api/patients/:patientId/lab-results` - Get patient lab results
- `GET /api/patients/:patientId/medical-reports` - Get patient medical reports
- `GET /api/patients/:patientId/doctors` - Get patient's assigned doctors

### Doctors
- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/:doctorId` - Get doctor by ID
- `GET /api/doctors/:doctorId/patients` - Get doctor's assigned patients
- `POST /api/doctors/:doctorId/assign-patient` - Assign patient to doctor
- `DELETE /api/doctors/:doctorId/patients/:patientId` - Remove patient assignment
- `GET /api/doctors/:doctorId/stats` - Get doctor statistics

### Vital Signs
- `POST /api/vital-signs/:patientId` - Add vital signs for patient
- `GET /api/vital-signs/:patientId/latest` - Get latest vital signs
- `GET /api/vital-signs/:patientId/history` - Get vital signs history
- `GET /api/vital-signs/:patientId/trends` - Get vital signs trends for charts
- `PUT /api/vital-signs/:signId` - Update vital signs
- `DELETE /api/vital-signs/:signId` - Delete vital signs

### Medical Reports
- `POST /api/medical-reports/:patientId` - Create medical report (doctors only)
- `GET /api/medical-reports/:patientId` - Get patient medical reports
- `GET /api/medical-reports/report/:reportId` - Get single medical report (decrypted)
- `PUT /api/medical-reports/report/:reportId` - Update medical report (doctors only)
- `DELETE /api/medical-reports/report/:reportId` - Delete medical report (doctors only)

### Health Check
- `GET /api/health` - Server health check

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Database Schema

The database schema is automatically created from the `database for med.txt` file, which includes:

- `users` - User accounts (doctors, patients, admins)
- `patient_profiles` - Patient demographic information
- `lab_results` - Patient lab test results
- `medical_reports` - Encrypted medical reports
- `vital_signs` - Patient vital signs measurements
- `doctor_patient_assignment` - Doctor-patient relationships

## Security Features

- **Password Hashing**: Using bcrypt for secure password storage
- **JWT Authentication**: Token-based authentication with expiration
- **Role-based Access Control**: Different permissions for different user roles
- **Data Encryption**: Medical reports are encrypted before storage
- **Input Validation**: Basic validation for all API inputs

## Error Handling

The API returns appropriate HTTP status codes and error messages:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Development Notes

- The server uses SQLite for simplicity and portability
- In production, consider using PostgreSQL or MySQL
- Encryption is simplified for demonstration - use proper key management in production
- CORS is enabled for development - restrict origins in production

## License

ISC

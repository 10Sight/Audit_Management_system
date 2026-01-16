# Audit Management System - Server

## Overview
This is the backend server for the Audit Management System. It is built using Node.js and Express, utilizing a MySQL database for data persistence. The architecture uses a custom ORM layer compatible with Mongoose-style method calls to support a hybrid migration strategy.

## Prerequisites
- **Node.js**: v16.0.0 or higher
- **MySQL**: v5.7 or higher (v8.0 recommended)
- **Redis** (Optional): For session management

## Installation

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in the `server` directory. You can use the following template:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (MySQL)
MYSQL_HOST=localhost
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=Audit Management System
MYSQL_PORT=3306

# Security
JWT_ACCESS_SECRET=your_jwt_secret_key
JWT_EXPIRY=7d
SESSION_SECRET=your_session_secret_key

# Optional: External Services
REDIS_URL=redis://localhost:6379
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
SMTP_USERNAME=your_email
SMTP_PASSWORD=your_app_password
```

## Database Setup

Before running the application, you must initialize the database tables.

1. **Initialize Tables**:
   Run the schema setup script. This creates all necessary tables (`employees`, `audits`, `departments`, etc.) in the correct dependency order.
   ```bash
   node db/init_sql.js
   ```

2. **Verify Installation** (Optional):
   Run the verbose check script to confirm all tables are present and accessible.
   ```bash
   node check_db_verbose.js
   ```

3. **Create Superadmin User**:
   Create the default superadmin account (`sa001` / `12345678`).
   ```bash
   node create_superadmin.js
   ```

## Running the Application

start the server:

```bash
npm start
```

The server will be available at `http://localhost:5000` (or your configured port).
Socket.IO is enabled on the same port.

## Project Structure

- **`models/`**: SQL-based model classes (e.g., `audit.model.js`, `auth.model.js`) that mimic Mongoose APIs.
- **`controllers/`**: Request handlers for API endpoints.
- **`routes/`**: API route definitions.
- **`db/`**: Database connection logic and SQL setup scripts (`setup_*.sql`).
- **`services/`**: Background services (e.g., Target Audit Reminders).
- **`middlewares/`**: Express middlewares (Auth, Error handling).

## Troubleshooting

- **Redis Error**: If you see a Redis connection error on startup, the server will automatically fall back to an in-memory session store. This is safe for development but not recommended for production.
- **Missing Tables**: If you encounter "Table doesn't exist" errors, ensure you have run `node db/init_sql.js` successfully.

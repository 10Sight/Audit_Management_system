import sql from 'mssql';
import { config } from 'dotenv';
config();

// Config to test (prioritize env, then defaults)
const dbConfig = {
    user: process.env.MSSQL_USER || process.env.MYSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD || process.env.MYSQL_PASSWORD,
    server: process.env.MSSQL_HOST || process.env.MYSQL_HOST || 'localhost',
    database: process.env.MSSQL_DATABASE || process.env.MYSQL_DATABASE || 'Audit Management System',
    port: parseInt(process.env.MSSQL_PORT || process.env.MYSQL_PORT) || 1433,
    options: {
        encrypt: false, // Start false for local
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

console.log('---------------------------------------------------');
console.log('Testing MSSQL Connection with config:');
console.log('Server:', dbConfig.server);
console.log('Port:', dbConfig.port);
console.log('User:', dbConfig.user);
console.log('Database:', dbConfig.database);
console.log('---------------------------------------------------');

async function testConnection() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('✅ Connection Sucessful!');
        const result = await pool.request().query('SELECT @@VERSION as version');
        console.log('DB Version:', result.recordset[0].version);
        await pool.close();
        process.exit(0);
    } catch (err) {
        console.log('❌ Connection Failed');
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);
        console.error('Code:', err.code);

        console.log('\n--- Troubleshooting Tips ---');
        console.log('1. Ensure SQL Server is running (Services -> SQL Server)');
        console.log('2. Ensure TCP/IP is ENABLED in SQL Server Configuration Manager under Network Configuration.');
        console.log('3. Restart SQL Server service after enabling TCP/IP.');
        console.log('4. Firewalls might be blocking port 1433.');
        console.log('5. If using a named instance (e.g., SQLEXPRESS), check the dynamic TCP port or use "localhost\\SQLEXPRESS".');
        process.exit(1);
    }
}

testConnection();

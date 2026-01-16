import connectDB, { pool } from './connectDB.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const setupTables = async () => {
    try {
        // Initialize DB connection first
        await connectDB();

        const sqlPath = path.join(__dirname, 'setup_employees.sql');
        const sqlPath2 = path.join(__dirname, 'setup_audits.sql');
        const sqlPath3 = path.join(__dirname, 'setup_audit_email_settings.sql');
        const sqlPath4 = path.join(__dirname, 'setup_audit_form_settings.sql');
        const sqlPath5 = path.join(__dirname, 'setup_departments.sql');
        const sqlPath6 = path.join(__dirname, 'setup_lines.sql');
        const sqlPath7 = path.join(__dirname, 'setup_machines.sql');
        const sqlPath8 = path.join(__dirname, 'setup_processes.sql');
        const sqlPath9 = path.join(__dirname, 'setup_questions.sql');
        const sqlPath10 = path.join(__dirname, 'setup_question_categories.sql');
        const sqlPath11 = path.join(__dirname, 'setup_units.sql');

        const sql1 = fs.readFileSync(sqlPath, 'utf8'); // Employees
        const sql2 = fs.readFileSync(sqlPath2, 'utf8'); // Audits (Move to end)
        const sql3 = fs.readFileSync(sqlPath3, 'utf8'); // Email Settings
        const sql4 = fs.readFileSync(sqlPath4, 'utf8'); // Form Settings
        const sql5 = fs.readFileSync(sqlPath5, 'utf8'); // Departments
        const sql6 = fs.readFileSync(sqlPath6, 'utf8'); // Lines
        const sql7 = fs.readFileSync(sqlPath7, 'utf8'); // Machines
        const sql8 = fs.readFileSync(sqlPath8, 'utf8'); // Processes
        const sql9 = fs.readFileSync(sqlPath9, 'utf8'); // Questions
        const sql10 = fs.readFileSync(sqlPath10, 'utf8'); // Categories
        const sql11 = fs.readFileSync(sqlPath11, 'utf8'); // Units

        // Correct Order:
        // 1. Employees (sql1)
        // 2. Units (sql11)
        // 3. Departments (sql5) -> Refs Employees, Units(loose)
        // 4. Lines (sql6) -> Refs Departments
        // 5. Machines (sql7) -> Refs Lines, Departments
        // 6. Processes (sql8)
        // 7. QuestionCategories (sql10)
        // 8. Questions (sql9) -> Refs Departments, Employees
        // 9. Audits (sql2) -> Refs Departments, Lines, Machines, Processes, Units, Employees
        // 10. Settings (sql3, sql4)

        const sql = sql1 + "\n" + sql11 + "\n" + sql5 + "\n" + sql6 + "\n" + sql7 + "\n" + sql8 + "\n" + sql10 + "\n" + sql9 + "\n" + sql2 + "\n" + sql3 + "\n" + sql4;

        // Split by semicolon to run multiple statements
        // Filter out empty statements
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        console.log(`Running ${statements.length} SQL statements...`);

        for (const statement of statements) {
            try {
                await pool.query(statement);
            } catch (statementErr) {
                console.warn(`Warning running statement: ${statementErr.message}`);
                // Continue to next statement
            }
        }

        console.log('Tables created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error setting up tables:', err);
        process.exit(1);
    }
};

setupTables();

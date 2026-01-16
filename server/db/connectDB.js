import mysql from "mysql2/promise";
import logger from "../logger/winston.logger.js";
import EVN from "../config/env.config.js";

let pool;

const createPool = (database) => {
    pool = mysql.createPool({
        host: EVN.MYSQL_HOST,
        user: EVN.MYSQL_USER,
        password: EVN.MYSQL_PASSWORD,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        port: EVN.MYSQL_PORT || 3306,
        charset: 'utf8mb4_general_ci'
    });
};

const connectDB = async () => {
    try {
        const dbName = EVN.MYSQL_DATABASE || "Audit Management System";

        // create temporary connection without database to ensure DB exists
        const tmpConn = await mysql.createConnection({
            host: EVN.MYSQL_HOST,
            user: EVN.MYSQL_USER,
            password: EVN.MYSQL_PASSWORD,
            port: EVN.MYSQL_PORT || 3306,
            charset: 'utf8mb4_general_ci'
        });

        await tmpConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
        await tmpConn.end();

        createPool(dbName);

        const connection = await pool.getConnection();
        logger.info("MySQL Database connected successfully.");
        connection.release();
    } catch (error) {
        logger.error(`MySQL Database connection failed: ${error.message}`);
        process.exit(1);
    }
};

export { pool };
export default connectDB;
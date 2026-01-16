import mysql from "mysql";
import logger from "../logger/winston.logger.js";
import EVN from "../config/env.config.js";

// Wrapper class to mimic mysql2/promise Connection
class PromiseConnection {
    constructor(connection) {
        this.connection = connection;
    }

    query(sql, values) {
        return new Promise((resolve, reject) => {
            this.connection.query(sql, values, (err, results, fields) => {
                if (err) return reject(err);
                resolve([results, fields]);
            });
        });
    }

    release() {
        this.connection.release();
    }

    beginTransaction() {
        return new Promise((resolve, reject) => {
            this.connection.beginTransaction((err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    commit() {
        return new Promise((resolve, reject) => {
            this.connection.commit((err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    rollback() {
        return new Promise((resolve, reject) => {
            this.connection.rollback(() => {
                resolve();
            });
        });
    }
}

// Wrapper class to mimic mysql2/promise Pool
class PromisePool {
    constructor(pool) {
        this.pool = pool;
    }

    query(sql, values) {
        return new Promise((resolve, reject) => {
            this.pool.query(sql, values, (err, results, fields) => {
                if (err) return reject(err);
                resolve([results, fields]);
            });
        });
    }

    getConnection() {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, connection) => {
                if (err) return reject(err);
                resolve(new PromiseConnection(connection));
            });
        });
    }
}

let pool;

const createPool = (database) => {
    const rawPool = mysql.createPool({
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
    pool = new PromisePool(rawPool);
};

const connectDB = async () => {
    try {
        const dbName = EVN.MYSQL_DATABASE || "Audit Management System";

        // create temporary connection without database to ensure DB exists
        const tmpConn = mysql.createConnection({
            host: EVN.MYSQL_HOST,
            user: EVN.MYSQL_USER,
            password: EVN.MYSQL_PASSWORD,
            port: EVN.MYSQL_PORT || 3306,
            charset: 'utf8mb4_general_ci'
        });

        const queryPromise = (conn, sql) => {
            return new Promise((resolve, reject) => {
                conn.query(sql, (err, results) => {
                    if (err) return reject(err);
                    resolve(results);
                });
            });
        };

        const endPromise = (conn) => {
            return new Promise((resolve, reject) => {
                conn.end((err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        };

        await queryPromise(tmpConn, `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
        await endPromise(tmpConn);

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
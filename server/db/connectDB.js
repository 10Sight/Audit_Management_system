import sql from "mssql";
import logger from "../logger/winston.logger.js";
import EVN from "../config/env.config.js";

const config = {
    user: EVN.MSSQL_USER,
    password: EVN.MSSQL_PASSWORD,
    server: EVN.MSSQL_HOST,
    database: EVN.MSSQL_DATABASE,
    port: parseInt(EVN.MSSQL_PORT) || 1433,
    options: {
        encrypt: false, // Use true for Azure, false for local dev usually
        trustServerCertificate: true, // Change to true for local dev / self-signed certs
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolConnection;

// Compatibility wrapper for MySQL-style queries
// Converts '?' placeholders to @p0, @p1, ... and binds parameters
class MsSqlPoolWrapper {
    constructor(originalPool) {
        this.originalPool = originalPool;
    }

    async query(queryString, params = []) {
        try {
            const request = this.originalPool.request();

            // Handle placeholders
            // Split by '?' and reconstruct with @p0, @p1...
            let sqlParts = queryString.split('?');
            let finalSql = sqlParts[0];

            if (params.length > 0 && sqlParts.length > 1) {
                // Determine parameter mapping
                for (let i = 0; i < params.length; i++) {
                    const checkout = params[i];
                    // Simple input binding
                    // mssql auto-detects types, usually safe for standard JS types
                    request.input(`p${i}`, checkout);

                    if (i < sqlParts.length - 1) {
                        finalSql += `@p${i}` + sqlParts[i + 1];
                    }
                }
                // Append any remaining parts if params run out (shouldn't happen in valid queries)
                // If there are more ? than params, it's an error, etc.
            } else {
                finalSql = queryString;
            }

            // Replace LIMIT/OFFSET with OFFSET-FETCH if needed? 
            // Better to handle that in the Model layer, but we can do simple regex replacers here if really needed.
            // For now, assume models will be updated.

            const result = await request.query(finalSql);

            // Return [rows, fields] format to mimic mysql2
            // result.recordset is the array of rows
            return [result.recordset, result.recordsets];
        } catch (error) {
            throw error;
        }
    }

    // Mimic getConnection for transactions if used
    // Transactions in mssql are different. 
    // If models use pool.getConnection() -> connection.beginTransaction(), we need a wrapper.
    async getConnection() {
        // Create a new transaction object or request-capable object from global pool
        // This is tricky. mssql transactions are tied to a connection from the pool.
        const transaction = new sql.Transaction(this.originalPool);
        await transaction.begin();

        // Return an object that looks like a connection
        return new TransactionWrapper(transaction);
    }
}

class TransactionWrapper {
    constructor(transaction) {
        this.transaction = transaction;
        this.request = new sql.Request(transaction);
        this.active = true;
    }

    async query(queryString, params = []) {
        // Same logic as pool wrapper but using this.request
        let sqlParts = queryString.split('?');
        let finalSql = sqlParts[0];

        if (params && params.length > 0) {
            for (let i = 0; i < params.length; i++) {
                this.request.input(`p${i}`, params[i]);
                if (i < sqlParts.length - 1) {
                    finalSql += `@p${i}` + sqlParts[i + 1];
                }
            }
        } else {
            finalSql = queryString;
        }

        const result = await this.request.query(finalSql);
        return [result.recordset, result.recordsets];
    }

    async release() {
        // No-op for mssql transaction usually, unless we rollback?
        // Typically explicit commit/rollback is called.
    }

    async commit() {
        if (this.active) {
            await this.transaction.commit();
            this.active = false;
        }
    }

    async rollback() {
        if (this.active) {
            await this.transaction.rollback();
            this.active = false;
        }
    }
}


const connectDB = async () => {
    try {
        poolConnection = await sql.connect(config);
        logger.info("MSSQL Database connected successfully.");
    } catch (error) {
        logger.error(`MSSQL Database connection failed: ${error.message}`);
        process.exit(1);
    }
};

// Export a proxy that mimics the 'pool' object
// We need to wait for connection in real app, but imports happen early.
// We'll export an object that delegates to poolConnection when used.
const pool = {
    query: async (sql, params) => {
        if (!poolConnection) {
            // Try connecting if not connected
            await connectDB();
        }
        const wrapper = new MsSqlPoolWrapper(poolConnection);
        return wrapper.query(sql, params);
    },
    getConnection: async () => {
        if (!poolConnection) {
            await connectDB();
        }
        const wrapper = new MsSqlPoolWrapper(poolConnection);
        return wrapper.getConnection();
    }
};


export { pool, sql };
export default connectDB;
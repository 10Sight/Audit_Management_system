import mongoose from "mongoose";
import logger from "../logger/winston.logger.js";
import EVN from "../config/env.config.js";

const connectDB = async () => {
    try {
        await mongoose.connect(EVN.MONGO_URI);
        logger.info("MongoDB Connected");
    } catch (error) {
        logger.error("MongoDB Connection Failed: ", error.message);
    }
};

export default connectDB;
import mongoose from "mongoose";
import logger from "../logger/winston.logger.js";

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://jatinnagar563:jatin5631@cluster0.knfen.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
        logger.info("MongoDB Connected");
    } catch (error) {
        logger.error("MongoDB Connection Failed: ", error.message);
    }
};

export default connectDB;
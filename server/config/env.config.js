import { config } from "dotenv";

config();

const EVN = {
    PORT: process.env.PORT || 5000,
    MONGO_URI: process.env.MONGO_URI,

    NODE_ENV: process.env.NODE_ENV || "development",
    JWT_ACCESS_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRY: process.env.JWT_EXPIRY,
    
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    REDIS_HOST: process.env.REDIS_HOST || "localhost",
    REDIS_PORT: process.env.REDIS_PORT || 6379,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
    SESSION_SECRET: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
}

export default EVN;
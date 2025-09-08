import { config } from "dotenv";

config();

const EVN = {
    PORT: process.env.PORT || 5000,
    MONGO_URI: process.env.MONGO_URI,

    NODE_ENV: process.env.NODE_ENV || "development",
    JWT_ACCESS_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRY: process.env.JWT_EXPIRY,
}

export default EVN;
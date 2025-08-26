import { config } from "dotenv";

config();

const EVN = {
    PORT: process.env.PORT || 8000,

    NODE_ENV: process.env.NODE_ENV || "development",
    JWT_ACCESS_SECRET: process.env.JWT_SECRET,
}

export default EVN;
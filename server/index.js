import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import ENV from "./config/env.config.js";
import connectDB from "./db/connectDB.js";
import authRoutes from "./routes/auth.route.js";
import machineRoutes from "./routes/machine.route.js";
import lineRoutes from "./routes/line.route.js";
import processRoutes from "./routes/process.route.js";
import auditRoutes from "./routes/audit.route.js";
import questionRoutes from "./routes/question.route.js";

const app = express();

app.use(cors({
  origin: "http://localhost:5173", 
  credentials: true,             
}));

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("This is Backend");
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/machines", machineRoutes);
app.use("/api/lines", lineRoutes);
app.use("/api/processes", processRoutes);
app.use("/api/audits", auditRoutes);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(ENV.PORT, () => {
      console.log(`Server running on http://localhost:${ENV.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import session from "express-session";
import RedisStore from "connect-redis";

import ENV from "./config/env.config.js";
import connectDB from "./db/connectDB.js";
import { getRedisClient } from "./config/redis.config.js";
import authRoutes from "./routes/auth.route.js";
import machineRoutes from "./routes/machine.route.js";
import lineRoutes from "./routes/line.route.js";
import processRoutes from "./routes/process.route.js";
import auditRoutes from "./routes/audit.route.js";
import questionRoutes from "./routes/question.route.js";
import departmentRoutes from "./routes/department.route.js";
import uploadRoutes from "./routes/upload.route.js";

const app = express();
const httpServer = createServer(app);

// Initialize Redis client (lazy)
const redisClient = getRedisClient();

// Base session config; store will be attached after successful Redis connect
const sessionConfig = {
  secret: ENV.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: ENV.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ['polling', 'websocket'], // prefer polling first for compatibility, then upgrade
  allowEIO3: false,
  pingTimeout: 30000,
  pingInterval: 25000,
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, // Allow for development
}));

// Enable gzip compression
app.use(compression());

// CORS configuration
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(cookieParser());

// Parse JSON with limit to prevent large payload attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Disable x-powered-by header for security
app.disable('x-powered-by');

app.get("/", (req, res) => {
  res.send("This is Backend Running");
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/machines", machineRoutes);
app.use("/api/lines", lineRoutes);
app.use("/api/processes", processRoutes);
app.use("/api/audits", auditRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/upload", uploadRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`👤 User connected: ${socket.id}`);

  // Join room based on user role or department
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`🏠 User ${socket.id} joined room: ${room}`);
  });

  // Leave room
  socket.on('leave-room', (room) => {
    socket.leave(room);
    console.log(`🚪 User ${socket.id} left room: ${room}`);
  });

  // Handle audit updates
  socket.on('audit-update', (data) => {
    socket.to(data.room || 'general').emit('audit-notification', {
      type: 'audit-update',
      message: data.message,
      auditId: data.auditId,
      timestamp: new Date().toISOString()
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`👋 User disconnected: ${socket.id}`);
  });
});

// Make io available globally for controllers
app.set('io', io);

// Attempt to listen on a port, trying subsequent ports if busy
const listenWithRetry = async (startPort, maxTries = 10) => {
  let port = Number(startPort) || 5000;
  for (let attempt = 0; attempt < maxTries; attempt++, port++) {
    const result = await new Promise((resolve) => {
      const onError = (err) => {
        httpServer.removeListener('listening', onListening);
        if (err && err.code === 'EADDRINUSE') return resolve(null);
        return resolve({ error: err });
      };
      const onListening = () => {
        httpServer.removeListener('error', onError);
        resolve(port);
      };
      httpServer.once('error', onError);
      httpServer.once('listening', onListening);
      httpServer.listen(port, '0.0.0.0');
    });
    if (typeof result === 'number') return result;
  }
  return null;
};

const startServer = async () => {
  try {
    const dbConnected = await connectDB();
    if (!dbConnected) {
      console.warn('⚠️ Starting server without MongoDB connection; some routes may be unavailable.');
    }
    
// Try to connect Redis if available, but don't fail if it's not
    if (redisClient) {
      try {
        await redisClient.connect();
        // Attach Redis store only after successful connection
        sessionConfig.store = new RedisStore({ client: redisClient });
        console.log('✅ Using Redis session store');
        console.log('✅ Redis connected successfully');
      } catch (error) {
        // Ensure Redis client is disconnected to prevent reconnection spam
        try { await redisClient.disconnect(); } catch {}
        console.warn('⚠️ Redis connection failed:', error.message);
        console.log('💡 Using memory session store (Redis not available)');
      }
    } else {
      console.log('💡 Using memory session store (Redis not available)');
    }

    // Apply session middleware after deciding the store
    app.use(session(sessionConfig));

    const port = await listenWithRetry(ENV.PORT, 10);
    if (!port) {
      console.error('❌ No available ports found near', ENV.PORT);
      process.exit(1);
    }

    console.log(`ℹ️ Selected port: ${port}`);
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`🔌 Socket.IO enabled`);
    if (!redisClient || !sessionConfig.store) {
      console.log('💡 Running without Redis caching (install Redis for better performance)');
    }
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

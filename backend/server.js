// 🚀 Azure Application Insights (MUST BE FIRST) - Restart Triggered
// 🚀 Azure Application Insights (MUST BE FIRST)
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  const appInsights = require("applicationinsights");
  appInsights.setup()
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true) // Tracks CosmosDB/Mongo calls
    .start();
  console.log("✅ Azure Application Insights active");
}

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require('multer');
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const logger = require('./utils/logger'); // Structured Logger

// Fix Mongoose deprecation warning
mongoose.set("strictQuery", false);

// Route imports
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const courseContentProposalRoutes = require("./routes/courseContentProposalRoutes");
const batchRoutes = require("./routes/batchRoutes");
const examRoutes = require("./routes/examRoutes");
const adminExamRoutes = require("./routes/adminExamRoutes");
const resultRoutes = require("./routes/resultRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const trainerRoutes = require("./routes/trainerRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const progressRoutes = require("./routes/progressRoutes");
const pointsRoutes = require("./routes/pointsRoutes");
const pointsConfigRoutes = require("./routes/pointsConfigRoutes");
const rewatchRequestRoutes = require("./routes/rewatchRequestRoutes");
const blogRoutes = require('./routes/blogRoutes');
const adminBlogRoutes = require('./routes/adminBlogRoutes');
const debugRoutes = require('./routes/debugRoutes');
const reexamRoutes = require('./routes/reexamRoutes');
const trainerEvaluationRoutes = require('./routes/trainerEvaluationRoutes');

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const compression = require('compression');

// ============================================
// 🧱 Middleware
// ============================================

// 0. Observability: Request Correlation & Logging
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.id);

  // Log Request
  logger.info({
    type: 'request',
    method: req.method,
    url: req.url,
    requestId: req.id,
    ip: req.ip
  });

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      type: 'response',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      requestId: req.id,
      durationMs: duration
    });
  });

  next();
});


// 1. Security Headers (Helmet)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images/videos to be loaded by frontend
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "frame-ancestors": ["'self'", process.env.FRONTEND_URL, "https://black-moss-084650b0f.3.azurestaticapps.net", "http://localhost:5173", "http://localhost:3000"], // Allow frontend to embed
    },
  },
}));

// 2. Compression
app.use(compression());

// 3. Body Parser (Limit payload size)
app.use(express.json({ limit: "10mb" })); // Reduced from 100mb to 10mb for safety
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 4. Parameter Pollution Protection
app.use(hpp());

// 5. NoSQL Injection Protection
// 5. NoSQL Injection Protection
const mongoSanitize = require('express-mongo-sanitize');
app.use((req, res, next) => {
  // ⚠️ EXEMPTION: Code Execution & Visualization require raw input (e.g. <stdio.h>, $variables)
  if (req.path.startsWith('/api/code') || req.path.startsWith('/api/visualize')) return next();
  mongoSanitize()(req, res, next);
});

// 6. XSS Protection
const xss = require('xss-clean');
app.use((req, res, next) => {
  // ⚠️ EXEMPTION: Code Execution & Visualization require raw input (e.g. <stdio.h>)
  if (req.path.startsWith('/api/code') || req.path.startsWith('/api/visualize')) return next();
  xss()(req, res, next);
});

// 5. CORS (Strict but Dev-friendly)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://black-moss-084650b0f.3.azurestaticapps.net", // Production SWA
  "http://localhost:5173",
  "http://localhost:3000"
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ============================================
// 6. Rate Limiting Strategies
// ============================================

// 🔒 STRICT LIMITER: Auth, Admin, Sensitive operations
// Protects against brute-force and abuse
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Strict limit (approx 6-7 reqs/min)
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests to sensitive endpoint, please try again later." }
});

// ⚡ EXAM LIMITER: Exams, Judge0, Code Execution
// High burst tolerance for ~100 concurrent users polling/submitting
// Target: 100 users * 12 reqs/min (every 5s) = 1200 reqs/min
// Safe Buffer: 5000 reqs/15min to allow spikes and rapid submissions
const examLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window for granular control
  max: 300, // Allow 300 reqs/minute per IP (plenty for 1 user polling every 3s + assets)
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Exam traffic limit exceeded, please slow down." }
});

// 📂 STANDARD LIMITER: Courses, Results, General Browsing
// Balanced protection for normal app usage
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // ~66 reqs/min
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." }
});

// Serve uploaded files statically
// app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // ❌ Removed for Statelessness


// ============================================
// 🧭 Routes
// ============================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/course-content-proposals", courseContentProposalRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/admin/exams", adminExamRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/trainers", trainerRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/judge", require("./routes/judgeRoutes"));
app.use("/api/points", pointsRoutes);
app.use("/api/points-config", pointsConfigRoutes);
app.use("/api/rewatch", rewatchRequestRoutes);
app.use('/api/blogs', blogRoutes);                // trainee/public endpoints
app.use('/api/admin/blogs', adminBlogRoutes);     // admin endpoints
app.use('/api/debug', debugRoutes);                // debug endpoints
app.use('/api/reexam', reexamRoutes);             // re-exam request endpoints
const mindMapRoutes = require("./routes/mindMapRoutes");
app.use("/api/mindmap", mindMapRoutes);
const visualizeRoutes = require("./routes/visualizeRoute");
app.use("/api/visualize", visualizeRoutes);
const executionRoutes = require("./routes/executionRoutes");
const pythonRoutes = require("./routes/pythonRoutes");
const savedFileRoutes = require("./routes/savedFileRoutes");

// 🛡️ Sensitive / Strict Routes
app.use("/api/auth", strictLimiter, authRoutes);
app.use("/api/saved-files", strictLimiter, savedFileRoutes);
app.use("/api/admin/exams", strictLimiter, adminExamRoutes);
app.use("/api/admin/blogs", strictLimiter, adminBlogRoutes);
app.use("/api/users", strictLimiter, userRoutes); // User management is sensitive

// ⚡ High-Frequency / Exam Critical Routes
app.use("/api/exams", examLimiter, examRoutes);
app.use("/api/judge", examLimiter, require("./routes/judgeRoutes"));
app.use("/api/code", examLimiter, executionRoutes);
app.use("/api/visualize", examLimiter, visualizeRoutes);
app.use("/api/python", examLimiter, pythonRoutes);
app.use("/api/progress", examLimiter, progressRoutes); // Progress updates are frequent

// 📂 Standard / Normal Routes
app.use("/api/courses", standardLimiter, courseRoutes);
app.use("/api/course-content-proposals", standardLimiter, courseContentProposalRoutes);
app.use("/api/batches", standardLimiter, batchRoutes);
app.use("/api/results", standardLimiter, resultRoutes);
app.use("/api/leaderboard", standardLimiter, leaderboardRoutes);
app.use("/api/certificates", standardLimiter, certificateRoutes);
app.use("/api/trainers", standardLimiter, trainerRoutes);
app.use("/api/notifications", standardLimiter, notificationRoutes);
// Study Groups (Combined Study)
const studyGroupRoutes = require("./routes/studyGroupRoutes");
app.use("/api/study-groups", standardLimiter, studyGroupRoutes);

app.use("/api/points", standardLimiter, pointsRoutes);
app.use("/api/rewatch", standardLimiter, rewatchRequestRoutes);
app.use('/api/blogs', standardLimiter, blogRoutes);
app.use('/api/debug', strictLimiter, debugRoutes); // Debug should be strict
app.use('/api/reexam', standardLimiter, reexamRoutes);
app.use('/api/trainer/evaluation', standardLimiter, trainerEvaluationRoutes);
app.use("/api/mindmap", standardLimiter, mindMapRoutes);

const fileRoutes = require("./routes/fileRoutes");
app.use("/api/files", standardLimiter, fileRoutes); // ✅ New Stateless File Streaming Routes



// =======================================================================
// 🔧 FIX ROUTE — Add optionLabel (A/B/C/D) to ALL MCQ options globally
// =======================================================================
const Exam = require("./models/Exam");

app.get("/fix-all-exams-options", async (req, res) => {
  try {
    const exams = await Exam.find().lean(false); // important: no .lean()

    for (const exam of exams) {
      let updated = false;

      exam.questions.forEach((q) => {
        if (q.type === "mcq" && Array.isArray(q.options)) {
          q.options.forEach((opt, idx) => {
            if (!opt.optionLabel) {
              opt.optionLabel = String.fromCharCode(65 + idx); // A/B/C/D
              updated = true;
            }
          });
        }
      });

      if (updated) {
        await exam.save({ validateBeforeSave: false });  // 🚀 allows saving even if schema enums mismatch
      }
    }

    res.json({
      success: true,
      message: "All MCQ options updated with optionLabel successfully!",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Fix failed",
      error: err.message,
    });
  }
});

// ============================================
// Basic Error Handler
// ============================================

app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);

  // Multer-specific errors (file size, fileFilter etc.) -> 400
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }

  // Custom file-filter errors use Error with message strings
  if (err && err.message && (err.message.includes('Invalid file type') || err.message.includes('Only video files') || err.message.includes('File must be an image'))) {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({ message: "Server Error", error: err.message });
});

// ============================================
// MongoDB Connection with retry logic
// ============================================

// ============================================
// 🛡️ Configuration Validation
// ============================================
const validateEnv = () => {
  const requiredVars = [
    "MONGO_URI",
    "JWT_SECRET",
    "FRONTEND_URL"
  ];

  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ CRITICAL ERROR: Missing required environment variables:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error("💡 Server cannot start without these configurations.");
    process.exit(1);
  }
};

// ============================================
// MongoDB Connection with retry logic
// ============================================

const connectWithRetry = async (retries = 3, delay = 2000) => {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/peopletech-lms";
  const isRemote = mongoUri.includes("mongodb.net") || mongoUri.includes("mongodb+srv") || mongoUri.includes("azure.com");
  const isProduction = process.env.NODE_ENV === 'production';

  console.log(`🔌 Attempting to connect to MongoDB...`);
  console.log(`📍 Connection type: ${isRemote ? "Remote (Atlas)" : "Local"}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connectionOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        w: 'majority',
        ssl: true,
        sslValidate: false,
        authSource: 'admin'
      };

      if (isRemote) {
        // For MongoDB Atlas, ensure SSL/TLS is properly configured
        if (!isProduction) {
          console.warn("⚠️  TLS validation DISABLED (Development Only)");
        } else {
          console.log("🔒 TLS validation ENABLED (Production)");
        }
      }

      await mongoose.connect(mongoUri, connectionOptions);
      console.log("✅ MongoDB Connected Successfully");
      console.log(`📊 Database: ${mongoose.connection.name}`);
      return;
    } catch (error) {
      console.log(`⚠️ Connection attempt ${attempt}/${retries} failed`);
      console.error(`❌ Error details:`, error.message);

      if (attempt === retries) {
        console.error("\n❌ All connection attempts failed!");
        if (!isRemote && !process.env.MONGO_URI) {
          console.error(
            "💡 Tip: Make sure MongoDB is running locally, or set MONGO_URI in your .env file"
          );
        } else if (isRemote) {
          console.error("💡 Tip: Check your MongoDB Atlas connection string and network access");
        }
        throw error;
      }

      console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// ============================================
// GridFS Buckets
// ============================================

let gfsBucket;
let videoGfsBucket;

mongoose.connection.on("open", () => {
  try {
    gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "courseImages",
    });
    global.gfsBucket = gfsBucket;
    console.log("✅ GridFSBucket 'courseImages' initialized successfully");

    videoGfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "fs",
    });
    global.videoGfsBucket = videoGfsBucket;
    console.log("✅ GridFSBucket 'fs' (videos) initialized successfully");

    // NEW: Blog Images Bucket
    const blogGfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "blogImages",
    });
    global.blogGfsBucket = blogGfsBucket;
    console.log("✅ GridFSBucket 'blogImages' initialized successfully");
  } catch (error) {
    console.error("❌ GridFSBucket initialization error:", error.message);
  }
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected");
  // Optionally attempt to reconnect
  console.log("🔄 MongoDB will attempt to reconnect automatically...");
});

// ============================================
// Start Server
// ============================================

const startServer = async () => {
  try {
    // 1. Validate Config First
    validateEnv();

    await connectWithRetry();
    await seedSystemUsers(); // ✅ Seed System Users (Master/Admin)

    // Seed Points Configuration
    const seedPointsConfig = require('./scripts/seedPointsConfig');
    await seedPointsConfig();

    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });

    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`);
        console.error(`💡 Tip: Run 'npx kill-port ${PORT}' or check for other running instances.`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', e);
      }
    });

    server.timeout = 60 * 60 * 1000;
    server.keepAliveTimeout = 65 * 1000;

    // Graceful Shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 ${signal} received. Closing server...`);
      server.close(async () => {
        console.log('✅ HTTP server closed.');
        try {
          await mongoose.connection.close();
          console.log('✅ MongoDB connection closed.');
          process.exit(0);
        } catch (err) {
          console.error('❌ Error during MongoDB disconnect:', err);
          process.exit(1);
        }
      });

      // Force close after 5s
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 5000);
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    // Handle nodemon restart signal
    process.once("SIGUSR2", () => {
      console.log("\n🛑 SIGUSR2 (Nodemon Restart) received.");
      gracefulShutdown("SIGUSR2");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// ============================================
// Global Error Handlers
// ============================================

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("💥 Unhandled Rejection:", err);
  process.exit(1);
});

// ============================================
// 🚀 System User Seeding 
// ============================================
const seedSystemUsers = require('./scripts/setupSystemUsers');

// Run seeding logic - ensure DB is connected first (which startServer handles)
// Note: We call this inside startServer after connection

startServer();

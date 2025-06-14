import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { errorHandler, notFoundHandler, requestLogger } from "./middleware";
import { db, pool } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";
import MemoryStore from "memorystore";
import { initializeDatabase } from "./migrate";

const app = express();

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Security headers (production-friendly CSP)
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "blob:", "https://replit.com"],
      connectSrc: ["'self'", "ws:", "wss:", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  } : false, // Disable CSP in development for easier debugging
  crossOriginEmbedderPolicy: false
}));

// Rate limiting (development-friendly)
const isDevelopment = process.env.NODE_ENV === 'development';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 1000, // Generous limit for both dev and production
  message: {
    error: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development
    return isDevelopment && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
  }
});

// Separate rate limiters for different auth operations
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 10, // 10 login attempts per 15 minutes
  message: {
    error: "Too many login attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return isDevelopment && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
  }
});

const registerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isDevelopment ? 100 : 5, // 5 registrations per 5 minutes
  message: {
    error: "Too many registration attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return isDevelopment && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
  }
});

// Apply rate limiting
if (!isDevelopment) {
  // Only apply general rate limiting in production
  app.use(limiter);
  // Apply specific auth rate limiting to login/register endpoints only
  app.use('/api/auth/admin-login', loginLimiter);
  app.use('/api/auth/register', registerLimiter);
} else {
  console.log('Rate limiting disabled for development environment');
}

// Request logging
app.use(requestLogger);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session store configuration
const isDevEnvironment = process.env.NODE_ENV === 'development';
let sessionStore;

if (isDevEnvironment) {
  // Use memory store for development
  const MemoryStoreConstructor = MemoryStore(session);
  sessionStore = new MemoryStoreConstructor({
    checkPeriod: 86400000 // prune expired entries every 24h
  });
} else {
  // Use PostgreSQL store for production
  const PgSession = connectPgSimple(session);
  sessionStore = new PgSession({
    pool: pool || undefined, // Use the existing database pool
    tableName: 'user_sessions', // Use a custom table name
    createTableIfMissing: true
  });
}

// Session middleware
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database and run migrations on startup
  if (process.env.NODE_ENV === 'production') {
    try {
      await initializeDatabase();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    }
  }

  const server = await registerRoutes(app);

  // 404 handler for API routes
  app.use('/api/*', notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use port 5500 for local development (less likely to be in use)
  const port = process.env.PORT || 5500;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

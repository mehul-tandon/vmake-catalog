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
  windowMs: 15 * 60 * 1000, // 15 minutesß
  max: isDevelopment ? 1000 : 500, // Higher limit for development
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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 5, // Much higher limit for development
  message: {
    error: "Too many authentication attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip auth rate limiting for localhost in development
    return isDevelopment && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
  }
});

// Apply rate limiting
if (!isDevelopment) {
  // Only apply rate limiting in production
  app.use(limiter);
  app.use('/api/auth', authLimiter);
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

// Database initialization endpoint (for production deployment) - MOVED HERE BEFORE registerRoutes
app.post('/api/init-db', async (req: express.Request, res: express.Response) => {
  try {
    console.log('Database initialization requested');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

    const { initKey } = req.body;
    
    // Security check - only allow with correct key
    const validKeys = [
      process.env.SESSION_SECRET,
      'default-init-key' // fallback key - change this in production
    ];

    if (!validKeys.includes(initKey)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // First, ensure database tables exist by running a simple query
    // If it fails, we know tables don't exist
    try {
      await db.select().from(users).limit(1);
      console.log('Database tables already exist');
    } catch (error: any) {
      if (error.code === '42P01') { // Table does not exist
        console.log('Creating database tables...');

        // Create tables using raw SQL since Drizzle push might not work in production
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "users" (
            "id" serial PRIMARY KEY NOT NULL,
            "name" varchar(255) NOT NULL,
            "whatsappNumber" varchar(20) NOT NULL,
            "password" varchar(255),
            "isAdmin" boolean DEFAULT false NOT NULL,
            "isPrimaryAdmin" boolean DEFAULT false NOT NULL,
            "createdAt" timestamp DEFAULT now() NOT NULL,
            "updatedAt" timestamp DEFAULT now() NOT NULL,
            CONSTRAINT "users_whatsappNumber_unique" UNIQUE("whatsappNumber")
          );
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS "products" (
            "id" serial PRIMARY KEY NOT NULL,
            "name" varchar(255) NOT NULL,
            "code" varchar(100) NOT NULL,
            "category" varchar(100),
            "length" numeric(10,2) DEFAULT 0,
            "breadth" numeric(10,2) DEFAULT 0,
            "height" numeric(10,2) DEFAULT 0,
            "finish" varchar(100),
            "material" varchar(100),
            "imageUrl" varchar(500),
            "imageUrls" text,
            "description" text,
            "status" varchar(50),
            "createdAt" timestamp DEFAULT now() NOT NULL,
            "updatedAt" timestamp DEFAULT now() NOT NULL,
            CONSTRAINT "products_code_unique" UNIQUE("code")
          );
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS "wishlists" (
            "id" serial PRIMARY KEY NOT NULL,
            "userId" integer NOT NULL,
            "productId" integer NOT NULL,
            "createdAt" timestamp DEFAULT now() NOT NULL,
            CONSTRAINT "wishlists_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action,
            CONSTRAINT "wishlists_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action
          );
        `);

        await pool.query(`
          CREATE TABLE IF NOT EXISTS "user_sessions" (
            "sid" varchar NOT NULL,
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL,
            CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
          );
        `);

        console.log('Database tables created successfully');
      } else {
        throw error; // Re-throw if it's a different error
      }
    }

    // Check if primary admin already exists
    const existingAdmin = await db.select().from(users).where(eq(users.isPrimaryAdmin, true)).limit(1);
    
    if (existingAdmin.length > 0) {
      return res.json({ message: 'Database already initialized', admin: existingAdmin[0].name });
    }

    // Create primary admin with your WhatsApp number
    const adminWhatsApp = '+918882636296';
    const newAdmin = await db.insert(users).values({
      name: 'Admin User',
      whatsappNumber: adminWhatsApp,
      password: null, // Will be set on first login
      isAdmin: true,
      isPrimaryAdmin: true,
    }).returning();

    res.json({ 
      message: 'Database initialized successfully', 
      admin: newAdmin[0].name,
      whatsappNumber: newAdmin[0].whatsappNumber 
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize database' });
  }
});

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

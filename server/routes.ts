import type { Express } from "express";
import { createServer } from "http";
import { db, pool } from "./db";
import { users, products, wishlists, type User, type InsertUser, type Product, type InsertProduct, type Wishlist, type InsertWishlist } from "../shared/schema";
import { eq, or, sql, and, desc, asc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../dist/public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600') // 100MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Storage interface - will use either database or mock storage
interface Storage {
  // User methods
  getUserByWhatsApp(whatsappNumber: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;

  // Product methods
  getAllProducts(options?: { category?: string; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<Product[]>;
  getProductById(id: number): Promise<Product | null>;
  getProductByCode(code: string): Promise<Product | null>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<Product>): Promise<Product | null>;
  deleteProduct(id: number): Promise<boolean>;

  // Wishlist methods
  getUserWishlist(userId: number): Promise<(Wishlist & { product: Product })[]>;
  addToWishlist(userId: number, productId: number): Promise<Wishlist>;
  removeFromWishlist(userId: number, productId: number): Promise<boolean>;
  isInWishlist(userId: number, productId: number): Promise<boolean>;
}

// Database storage implementation
class DatabaseStorage implements Storage {
  async getUserByWhatsApp(whatsappNumber: string): Promise<User | null> {
    try {
      const result = await db.select().from(users).where(eq(users.whatsappNumber, whatsappNumber)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const result = await db.insert(users).values(user).returning();
      return result[0];
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | null> {
    try {
      const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users).orderBy(desc(users.createdAt));
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async getAllProducts(options: { category?: string; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}): Promise<Product[]> {
    try {
      let query = db.select().from(products);
      
      const conditions = [];
      
      if (options.category) {
        conditions.push(eq(products.category, options.category));
      }
      
      if (options.search) {
        conditions.push(
          or(
            sql`${products.name} ILIKE ${`%${options.search}%`}`,
            sql`${products.code} ILIKE ${`%${options.search}%`}`,
            sql`${products.description} ILIKE ${`%${options.search}%`}`
          )
        );
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      // Apply sorting
      const sortField = options.sortBy === 'name' ? products.name : 
                       options.sortBy === 'code' ? products.code :
                       options.sortBy === 'category' ? products.category :
                       products.createdAt;
      
      const sortOrder = options.sortOrder === 'asc' ? asc : desc;
      query = query.orderBy(sortOrder(sortField));
      
      return await query;
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async getProductById(id: number): Promise<Product | null> {
    try {
      const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async getProductByCode(code: string): Promise<Product | null> {
    try {
      const result = await db.select().from(products).where(eq(products.code, code)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    try {
      const result = await db.insert(products).values(product).returning();
      return result[0];
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | null> {
    try {
      const result = await db.update(products).set(updates).where(eq(products.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async deleteProduct(id: number): Promise<boolean> {
    try {
      const result = await db.delete(products).where(eq(products.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async getUserWishlist(userId: number): Promise<(Wishlist & { product: Product })[]> {
    try {
      const result = await db
        .select({
          id: wishlists.id,
          userId: wishlists.userId,
          productId: wishlists.productId,
          createdAt: wishlists.createdAt,
          product: products
        })
        .from(wishlists)
        .innerJoin(products, eq(wishlists.productId, products.id))
        .where(eq(wishlists.userId, userId))
        .orderBy(desc(wishlists.createdAt));
      
      return result;
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async addToWishlist(userId: number, productId: number): Promise<Wishlist> {
    try {
      const result = await db.insert(wishlists).values({ userId, productId }).returning();
      return result[0];
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async removeFromWishlist(userId: number, productId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(wishlists)
        .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async isInWishlist(userId: number, productId: number): Promise<boolean> {
    try {
      const result = await db
        .select()
        .from(wishlists)
        .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
        .limit(1);
      return result.length > 0;
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }
}

// Create storage instance
const storage: Storage = new DatabaseStorage();

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // Database initialization endpoint (for production deployment)
  app.post('/api/init-db', async (req, res) => {
    try {
      console.log('Database initialization requested');
      console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

      const { initKey } = req.body;
      
      // Security check - only allow with correct key
      const validKeys = [
        process.env.SESSION_SECRET,
        'default-init-key' // fallback key
      ];

      if (!validKeys.includes(initKey)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // First, ensure database tables exist by running a simple query
      try {
        await db.select().from(users).limit(1);
        console.log('Database tables already exist');
      } catch (error: any) {
        if (error.code === '42P01') { // Table does not exist
          console.log('Creating database tables...');

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
          throw error;
        }
      }

      // Check if primary admin already exists
      const existingAdmin = await db.select().from(users).where(eq(users.isPrimaryAdmin, true)).limit(1);
      
      if (existingAdmin.length > 0) {
        return res.json({ message: 'Database already initialized', admin: existingAdmin[0].name });
      }

      // Create primary admin
      const adminWhatsApp = '+918882636296';
      const newAdmin = await db.insert(users).values({
        name: 'Admin User',
        whatsappNumber: adminWhatsApp,
        password: null,
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

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUserByWhatsApp(req.session.userWhatsApp);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      req.user = user;
      next();
    } catch (error) {
      console.error('Admin check error:', error);
      return res.status(500).json({ message: "Server error" });
    }
  };

  // Auth routes
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUserByWhatsApp(req.session.userWhatsApp);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          whatsappNumber: user.whatsappNumber,
          isAdmin: user.isAdmin,
          isPrimaryAdmin: user.isPrimaryAdmin,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('Auth me error:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, whatsappNumber, password } = req.body;

      if (!name || !whatsappNumber || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByWhatsApp(whatsappNumber);
      if (existingUser) {
        return res.status(400).json({ message: "User with this WhatsApp number already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const newUser = await storage.createUser({
        name,
        whatsappNumber,
        password: hashedPassword,
        isAdmin: false,
        isPrimaryAdmin: false
      });

      // Set session
      req.session.userId = newUser.id;
      req.session.userWhatsApp = newUser.whatsappNumber;

      res.json({
        user: {
          id: newUser.id,
          name: newUser.name,
          whatsappNumber: newUser.whatsappNumber,
          isAdmin: newUser.isAdmin,
          isPrimaryAdmin: newUser.isPrimaryAdmin,
          createdAt: newUser.createdAt
        },
        success: true
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { whatsappNumber, password } = req.body;

      if (!whatsappNumber || !password) {
        return res.status(400).json({ message: "WhatsApp number and password are required" });
      }

      // Find user
      const user = await storage.getUserByWhatsApp(whatsappNumber);
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check password
      if (!user.password) {
        return res.status(400).json({ message: "Please set up your password first" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.userWhatsApp = user.whatsappNumber;

      res.json({
        user: {
          id: user.id,
          name: user.name,
          whatsappNumber: user.whatsappNumber,
          isAdmin: user.isAdmin,
          isPrimaryAdmin: user.isPrimaryAdmin,
          createdAt: user.createdAt
        },
        success: true
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed. Please try again." });
    }
  });

  app.post("/api/auth/admin-login", async (req, res) => {
    try {
     

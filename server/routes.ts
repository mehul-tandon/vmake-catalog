import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertWishlistSchema, insertFeedbackSchema, adminLoginSchema, type User, type Feedback } from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcrypt";
import csvParser from "csv-parser";
import { initializeDatabase } from "./migrate";

// Configure multer with increased file size limit (100MB)
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB in bytes
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Hash password function
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password function
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', async (_req, res) => {
    try {
      // Test database connection
      const result = await storage.testConnection();
      res.json({
        status: 'healthy',
        database: result ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Database initialization endpoint (for production deployment) - GET version
  app.get('/api/init-db', async (_req, res) => {
    try {
      console.log('Database initialization requested via GET');
      await initializeDatabase();
      res.json({ message: 'Database initialized successfully' });
    } catch (error) {
      console.error('Database initialization error:', error);
      res.status(500).json({ error: 'Failed to initialize database' });
    }
  });

  // Database initialization endpoint (for production deployment) - POST version
  app.post('/api/init-db', async (req, res) => {
    try {
      console.log('Database initialization requested');
      const { initKey } = req.body;

      const validKeys = [process.env.SESSION_SECRET, 'default-init-key'];
      if (!validKeys.includes(initKey)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await initializeDatabase();
      res.json({ message: 'Database initialized successfully' });
    } catch (error) {
      console.error('Database initialization error:', error);
      res.status(500).json({ error: 'Failed to initialize database' });
    }
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, whatsappNumber } = insertUserSchema.parse(req.body);

      let user;
      try {
        user = await storage.getUserByWhatsApp(whatsappNumber);
        if (!user) {
          user = await storage.createUser({ name, whatsappNumber });
        } else {
          // Check if the existing user is an admin
          if (user.isAdmin) {
            return res.status(403).json({
              message: "Admin users must login through the admin page",
              isAdmin: true
            });
          }
        }
      } catch (storageError) {
        console.error("Storage error:", storageError);
        return res.status(500).json({
          message: "Registration failed. Please try again."
        });
      }

      // Set session
      if (req.session) {
        (req.session as any).userId = user.id;
      }

      res.json({ user, success: true });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({
        message: error.message.includes("require")
          ? "Registration failed. Please try again."
          : error.message
      });
    }
  });

  // Add categories and finishes API endpoints
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/finishes", async (_req, res) => {
    try {
      const finishes = await storage.getFinishes();
      res.json(finishes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/materials", async (_req, res) => {
    try {
      const materials = await storage.getMaterials();
      res.json(materials);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dynamic filter endpoints that return only available options based on current selections
  app.get("/api/filters/categories", async (req, res) => {
    try {
      const { finish, material } = req.query;
      const categories = await storage.getAvailableCategories({
        finish: finish === "all" ? undefined : finish as string,
        material: material === "all" ? undefined : material as string,
      });
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/filters/finishes", async (req, res) => {
    try {
      const { category, material } = req.query;
      const finishes = await storage.getAvailableFinishes({
        category: category === "all" ? undefined : category as string,
        material: material === "all" ? undefined : material as string,
      });
      res.json(finishes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/filters/materials", async (req, res) => {
    try {
      const { category, finish } = req.query;
      const materials = await storage.getAvailableMaterials({
        category: category === "all" ? undefined : category as string,
        finish: finish === "all" ? undefined : finish as string,
      });
      res.json(materials);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Wishlist API endpoints
  app.get("/api/wishlist", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const wishlist = await storage.getWishlistByUser(userId);
      res.json(wishlist);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/wishlist", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { productId } = insertWishlistSchema.parse({ ...req.body, userId });

      // Check if already in wishlist
      const isInWishlist = await storage.isInWishlist(userId, productId);
      if (isInWishlist) {
        return res.status(400).json({ message: "Product already in wishlist" });
      }

      const wishlist = await storage.addToWishlist({ userId, productId });
      res.json(wishlist);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/wishlist/:productId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const productId = parseInt(req.params.productId);
      const success = await storage.removeFromWishlist(userId, productId);

      if (!success) {
        return res.status(404).json({ message: "Item not found in wishlist" });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin login route
  app.post("/api/auth/admin-login", async (req, res) => {
    try {
      console.log("Admin login attempt:", {
        whatsappNumber: req.body.whatsappNumber,
        hasPassword: !!req.body.password
      });

      const { whatsappNumber, password } = adminLoginSchema.parse(req.body);

      const user = await storage.getUserByWhatsApp(whatsappNumber);
      console.log("User found:", user ? {
        id: user.id,
        isAdmin: user.isAdmin,
        hasPassword: !!user.password
      } : "No user found");

      if (!user || !user.isAdmin) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      // For users without a password yet (backward compatibility)
      if (!user.password) {
        // Set password for existing admin accounts
        console.log("Setting password for admin without password");
        const hashedPassword = await hashPassword(password);
        await storage.updateUserPassword(user.id, hashedPassword);
      } else {
        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password);
        console.log("Password verification result:", isPasswordValid);

        if (!isPasswordValid) {
          return res.status(401).json({ message: "Invalid admin credentials" });
        }
      }

      // Set session
      if (req.session) {
        (req.session as any).userId = user.id;
        console.log("Session set with userId:", user.id);
      } else {
        console.error("No session object available");
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user as any;

      res.json({ user: userWithoutPassword, success: true });
    } catch (error: any) {
      console.error("Admin login error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          res.status(500).json({ message: "Could not log out" });
        } else {
          res.json({ success: true });
        }
      });
    } else {
      res.json({ success: true });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.json({ user });
  });

  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const { search, category, finish, material, sortBy, page = "1", limit = "50" } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      let products;
      let total = 0;

      if (search) {
        products = await storage.searchProducts(search as string, limitNum, offset);
        total = await storage.getSearchCount(search as string);
      } else {
        products = await storage.filterProducts({
          category: category === "all" ? undefined : category as string,
          finish: finish === "all" ? undefined : finish as string,
          material: material === "all" ? undefined : material as string,
          sortBy: sortBy as string,
          limit: limitNum,
          offset: offset,
        });
        total = await storage.getFilterCount({
          category: category === "all" ? undefined : category as string,
          finish: finish === "all" ? undefined : finish as string,
          material: material === "all" ? undefined : material as string,
        });
      }

      res.json({
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(parseInt(req.params.id), productData);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const success = await storage.deleteProduct(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Excel upload route
  app.post("/api/products/upload-excel", upload.single('excel'), async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      let products = [];

      // Log file info for debugging
      console.log(`Processing file: ${req.file.originalname}, size: ${req.file.size}, type: ${fileExtension}`);

      if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        // Process Excel file
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        console.log(`Excel data rows: ${data.length}, Sample row:`, data.length > 0 ? data[0] : "No data");

        products = data.map((row: any) => ({
          name: row.name || row.Name || '',
          code: row.code || row.Code || '',
          category: row.category || row.Category || '',
          length: parseFloat(row.length || row.Length || '0'),
          breadth: parseFloat(row.breadth || row.Breadth || '0'),
          height: parseFloat(row.height || row.Height || '0'),
          finish: row.finish || row.Finish || '',
          material: row.material || row.Material || '',
          imageUrl: row.imageUrl || row.ImageUrl || row.image_url || '',
        }));
      } else if (fileExtension === '.csv') {
        // Process CSV file
        const data: any[] = [];

        await new Promise((resolve, reject) => {
          fs.createReadStream(req.file!.path)
            .pipe(csvParser())
            .on('data', (row) => {
              // Log sample rows for debugging
              if (data.length < 2) {
                console.log("CSV row sample:", row);
              }
              data.push(row);
            })
            .on('end', resolve)
            .on('error', reject);
        });

        console.log(`CSV data rows: ${data.length}`);

        // Clean BOM characters and normalize keys
        const cleanedData = data.map((row: any) => {
          const cleanedRow: any = {};
          Object.keys(row).forEach(key => {
            // Remove BOM character (\uFEFF) and normalize key
            const cleanKey = key.replace(/^\uFEFF/, '').trim().toLowerCase();
            cleanedRow[cleanKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
          });
          return cleanedRow;
        });

        console.log("Cleaned CSV row sample:", cleanedData[0]);

        // Find all possible keys that could be name or code
        const nameKeys = ['name', 'product_name', 'productname', 'product name'];
        const codeKeys = ['code', 'product_code', 'productcode', 'product code', 'sku'];

        products = cleanedData.map((row: any) => {
          // Try to find name and code in different possible formats
          let name = '';
          let code = '';

          for (const key of nameKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              name = row[key];
              break;
            }
          }

          for (const key of codeKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              code = row[key];
              break;
            }
          }

          // Check all row keys if we still haven't found name or code
          if (!name || !code) {
            for (const key in row) {
              const value = row[key];
              if (!value) continue;

              // If key contains 'name' and we haven't found a name yet
              if (!name && key.toLowerCase().includes('name')) {
                name = value;
              }

              // If key contains 'code' or 'sku' and we haven't found a code yet
              if (!code && (key.toLowerCase().includes('code') || key.toLowerCase().includes('sku'))) {
                code = value;
              }
            }
          }

          return {
            name,
            code,
            category: row.category || '',
            length: parseFloat(row.length || '0'),
            breadth: parseFloat(row.breadth || '0'),
            height: parseFloat(row.height || '0'),
            finish: row.finish || '',
            material: row.material || '',
            imageUrl: row.imageurl || row.image_url || '',
          };
        });
      } else {
        return res.status(400).json({ message: "Unsupported file format. Please upload XLSX, XLS, or CSV file." });
      }

      const validProducts = products.filter(p => p.name && p.code);

      console.log(`Total products: ${products.length}, Valid products: ${validProducts.length}`);

      if (products.length > 0 && validProducts.length === 0) {
        console.log("Sample invalid product:", products[0]);
      }

      const createdProducts = await storage.bulkCreateProducts(validProducts);

      res.json({
        success: true,
        imported: createdProducts.length,
        total: products.length
      });
    } catch (error: any) {
      console.error("Excel upload error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Only Excel export for wishlist
  app.get("/api/wishlist/export/excel", async (req, res) => {
    try {
      // Allow admin to export a specific user's wishlist
      const requestedUserId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const adminId = (req.session as any)?.userId;

      let userId: number;

      // If admin is requesting another user's wishlist
      if (requestedUserId && adminId) {
        const admin = await storage.getUser(adminId);
        if (!admin?.isAdmin) {
          return res.status(403).json({ message: "Admin access required to export other users' wishlists" });
        }
        userId = requestedUserId;
      } else {
        // Regular user exporting their own wishlist
        userId = (req.session as any)?.userId;
        if (!userId) {
          return res.status(401).json({ message: "Not authenticated" });
        }
      }

      const wishlistItems = await storage.getWishlistByUser(userId);
      const user = await storage.getUser(userId);

      if (!wishlistItems.length) {
        return res.status(404).json({ message: "No items in wishlist" });
      }

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();

      // Format data for Excel (without image URLs)
      const data = wishlistItems.map((item, index) => ({
        "No.": index + 1,
        "Code": item.product.code,
        "Name": item.product.name,
        "Category": item.product.category,
        "Material": item.product.material || "Not specified",
        "Dimensions (cm)": `${item.product.length}×${item.product.breadth}×${item.product.height}`,
        "Finish": item.product.finish
      }));

      // Add header rows (This creates title rows before the actual data)
      const header = [
        ["Vmake Finessee - Customer Wishlist"],
        [`Customer: ${user?.name}`],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [""], // Empty row for spacing
        [] // Empty row before the actual headers
      ];

      // Create worksheet with header
      const ws = XLSX.utils.aoa_to_sheet(header);

      // Add styling for header (merge cells for title)
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }); // Merge first row
      ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }); // Merge second row
      ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }); // Merge third row

      // Add the data to the worksheet starting from row 5
      XLSX.utils.sheet_add_json(ws, data, { origin: 5 });

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, ws, "Wishlist");

      // Generate Excel file
      const filename = `Vmake_Finessee_Wishlist_${user?.name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
      const filePath = path.join('uploads', filename);

      XLSX.writeFile(workbook, filePath);

      // Send file to client
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Error sending file:", err);
        }

        // Delete file after sending
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting file:", unlinkErr);
          }
        });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User management endpoints
  app.get("/api/users", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();

      // Remove password field for security
      const sanitizedUsers = users.map(user => {
        const { password, ...rest } = user as any;
        return rest;
      });

      res.json(sanitizedUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user details with wishlist for admin
  app.get("/api/admin/users/:userId", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's wishlist
      const wishlist = await storage.getWishlistByUser(userId);

      // Remove password field for security
      const { password, ...sanitizedUser } = user as any;

      res.json({
        user: sanitizedUser,
        wishlist: wishlist
      });
    } catch (error: any) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { name, whatsappNumber, password, isAdmin } = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByWhatsApp(whatsappNumber);
      if (existingUser) {
        return res.status(400).json({ message: "User with this WhatsApp number already exists" });
      }

      // Create new user
      const user = await storage.createUser({ name, whatsappNumber });

      // Set password and admin status if provided
      if (password || isAdmin) {
        const updates: Partial<User> = {};

        if (password) {
          updates.password = await hashPassword(password);
        }

        if (isAdmin) {
          updates.isAdmin = true;

          // Only primary admin can create another admin
          if (admin.isPrimaryAdmin) {
            updates.isPrimaryAdmin = false; // Secondary admin
          } else {
            // Non-primary admin can't create admins
            updates.isAdmin = false;
          }
        }

        await storage.updateUser(user.id, updates);
      }

      const updatedUser = await storage.getUser(user.id);

      // Remove password field for security
      const { password: _, ...sanitizedUser } = updatedUser as any;

      res.json(sanitizedUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userId = parseInt(req.params.id);
      const { name, whatsappNumber, password, isAdmin, isPrimaryAdmin } = req.body;

      // Get user to update
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent modifying primary admin unless you are primary admin
      if (user.isPrimaryAdmin && !admin.isPrimaryAdmin) {
        return res.status(403).json({ message: "Only primary admin can modify another primary admin" });
      }

      // Create update object
      const updates: Partial<User> = {};

      if (name) updates.name = name;
      if (whatsappNumber) updates.whatsappNumber = whatsappNumber;
      if (password) updates.password = await hashPassword(password);

      // Admin privileges - only primary admin can set these
      if (admin.isPrimaryAdmin) {
        if (isAdmin !== undefined) updates.isAdmin = isAdmin;
        if (isPrimaryAdmin !== undefined) updates.isPrimaryAdmin = isPrimaryAdmin;
      }

      const updatedUser = await storage.updateUser(userId, updates);

      // Remove password field for security
      const { password: _, ...sanitizedUser } = updatedUser as any;

      res.json(sanitizedUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userId = parseInt(req.params.id);

      // Get user to delete
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent deleting primary admin
      if (user.isPrimaryAdmin) {
        return res.status(403).json({ message: "Cannot delete primary admin" });
      }

      // Prevent admin from deleting themselves
      if (userId === adminId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const success = await storage.deleteUser(userId);

      if (!success) {
        return res.status(500).json({ message: "Failed to delete user" });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export user data endpoint
  app.get("/api/users/export", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();

      // Format data for Excel (excluding sensitive information)
      const data = users.map((user, index) => ({
        "No.": index + 1,
        "Name": user.name,
        "WhatsApp Number": user.whatsappNumber,
        "Admin": user.isAdmin ? "Yes" : "No",
        "Primary Admin": user.isPrimaryAdmin ? "Yes" : "No",
        "Registered On": new Date(user.createdAt!).toLocaleDateString()
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, ws, "Users");

      // Generate Excel file
      const filename = `Vmake_Finessee_Users_${Date.now()}.xlsx`;
      const filePath = path.join('uploads', filename);

      XLSX.writeFile(workbook, filePath);

      // Send file to client
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Error sending file:", err);
        }

        // Delete file after sending
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting file:", unlinkErr);
          }
        });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Mock feedback data for development
  let mockFeedback: Feedback[] = [
    {
      id: 1,
      userId: 1,
      productId: 1,
      customerName: "Priya Sharma",
      customerPhone: "+919876543210",
      rating: 5,
      title: "Absolutely Beautiful Brass Ganesha!",
      message: "The craftsmanship is exceptional. The intricate details on this brass Ganesha idol are stunning. It's become the centerpiece of our home temple. Highly recommend Vmake Finessee for authentic handcrafted pieces.",
      isApproved: true,
      isPublished: true,
      adminNotes: "Excellent feedback, customer very satisfied",
      createdAt: new Date("2024-05-15"),
      updatedAt: new Date("2024-05-15"),
    },
    {
      id: 2,
      userId: 2,
      productId: 2,
      customerName: "Rajesh Kumar",
      customerPhone: "+919123456789",
      rating: 4,
      title: "Great Quality Home Decor",
      message: "Ordered a decorative brass bowl for our living room. The quality is excellent and the finish is perfect. Delivery was prompt. Will definitely order more items.",
      isApproved: false,
      isPublished: false,
      adminNotes: null,
      createdAt: new Date("2024-05-20"),
      updatedAt: new Date("2024-05-20"),
    },
    {
      id: 3,
      userId: 3,
      productId: 1,
      customerName: "Meera Patel",
      customerPhone: "+919988776655",
      rating: 5,
      title: "Perfect for Diwali Decoration",
      message: "Bought this for Diwali and it was perfect! The brass work is authentic and the size is just right. My guests complimented the beautiful piece. Thank you Vmake Finessee!",
      isApproved: true,
      isPublished: true,
      adminNotes: "Good feedback, consider publishing",
      createdAt: new Date("2024-05-25"),
      updatedAt: new Date("2024-05-25"),
    },
    {
      id: 4,
      userId: 4,
      productId: 3,
      customerName: "Anita Singh",
      customerPhone: "+919876543211",
      rating: 4,
      title: "Beautiful Craftsmanship",
      message: "The attention to detail in this brass piece is remarkable. It adds such elegance to our home. The packaging was also excellent. Highly recommended!",
      isApproved: true,
      isPublished: true,
      adminNotes: "Great customer satisfaction",
      createdAt: new Date("2024-05-28"),
      updatedAt: new Date("2024-05-28"),
    },
    {
      id: 5,
      userId: 5,
      productId: 2,
      customerName: "Vikram Joshi",
      customerPhone: "+919123456788",
      rating: 5,
      title: "Exceeded Expectations",
      message: "The quality is outstanding! This brass artifact is even more beautiful in person. The finish is perfect and it arrived safely. Will definitely be a repeat customer.",
      isApproved: true,
      isPublished: true,
      adminNotes: "Excellent review",
      createdAt: new Date("2024-05-30"),
      updatedAt: new Date("2024-05-30"),
    },
  ];

  // Feedback routes
  app.get("/api/feedback", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // For development, return mock data
      res.json(mockFeedback);
    } catch (error: any) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/feedback/published", async (_req, res) => {
    try {
      // For development, return published mock data
      const publishedFeedback = mockFeedback.filter(f => f.isPublished);
      res.json(publishedFeedback);
    } catch (error: any) {
      console.error("Error fetching published feedback:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/feedback", async (req, res) => {
    try {
      const feedbackData = insertFeedbackSchema.parse(req.body);

      // For development, add to mock data
      const newFeedback: Feedback = {
        ...feedbackData,
        id: mockFeedback.length + 1,
        productId: feedbackData.productId || null,
        customerPhone: feedbackData.customerPhone || null,
        adminNotes: null,
        isApproved: false,
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockFeedback.push(newFeedback);

      res.status(201).json(newFeedback);
    } catch (error: any) {
      console.error("Error creating feedback:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/feedback/:id", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const feedbackId = parseInt(req.params.id);
      const updates = req.body;

      // For development, update mock data
      const index = mockFeedback.findIndex(f => f.id === feedbackId);
      if (index === -1) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      mockFeedback[index] = {
        ...mockFeedback[index],
        ...updates,
        updatedAt: new Date(),
      };

      res.json(mockFeedback[index]);
    } catch (error: any) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/feedback/:id", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const feedbackId = parseInt(req.params.id);

      // For development, remove from mock data
      const index = mockFeedback.findIndex(f => f.id === feedbackId);
      if (index === -1) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      mockFeedback.splice(index, 1);
      res.json({ message: "Feedback deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting feedback:", error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

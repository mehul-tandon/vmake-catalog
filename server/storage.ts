import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

import { users, products, wishlists, type User, type InsertUser, type Product, type InsertProduct, type Wishlist, type InsertWishlist } from "@shared/schema";
import { db } from "./db";
import { eq, or, sql, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByWhatsApp(whatsappNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserPassword(id: number, password: string): Promise<boolean>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Product operations
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductByCode(code: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  searchProducts(query: string, limit?: number, offset?: number): Promise<Product[]>;
  getSearchCount(query: string): Promise<number>;
  filterProducts(filters: { category?: string; finish?: string; material?: string; sortBy?: string; limit?: number; offset?: number }): Promise<Product[]>;
  getFilterCount(filters: { category?: string; finish?: string; material?: string }): Promise<number>;
  bulkCreateProducts(products: InsertProduct[]): Promise<Product[]>;

  // Wishlist operations
  getWishlistByUser(userId: number): Promise<(Wishlist & { product: Product })[]>;
  addToWishlist(wishlist: InsertWishlist): Promise<Wishlist>;
  removeFromWishlist(userId: number, productId: number): Promise<boolean>;
  isInWishlist(userId: number, productId: number): Promise<boolean>;

  // New methods for categories and finishes
  getCategories(): Promise<string[]>;
  getFinishes(): Promise<string[]>;
  getMaterials(): Promise<string[]>;

  // Dynamic filter methods that return only available options based on current selections
  getAvailableCategories(filters: { finish?: string; material?: string }): Promise<string[]>;
  getAvailableFinishes(filters: { category?: string; material?: string }): Promise<string[]>;
  getAvailableMaterials(filters: { category?: string; finish?: string }): Promise<string[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private wishlists: Map<number, Wishlist>;
  private currentUserId: number;
  private currentProductId: number;
  private currentWishlistId: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.wishlists = new Map();
    this.currentUserId = 1;
    this.currentProductId = 1;
    this.currentWishlistId = 1;

    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create admin user
    const adminUser: User = {
      id: this.currentUserId++,
      name: "Admin User",
      whatsappNumber: "+1234567890",
      password: null,
      isAdmin: true,
      isPrimaryAdmin: true,
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Create sample products with multiple images
    const sampleProducts: any[] = [
      {
        name: "Handcrafted Brass Ganesha Idol",
        code: "VF-BG-001",
        category: "Brass Idols",
        length: 15,
        breadth: 12,
        height: 20,
        finish: "Antique Brass",
        material: "Pure Brass",
        imageUrl: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        imageUrls: [
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80",
          "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=90"
        ],
        description: "Exquisitely handcrafted brass Ganesha idol with intricate detailing. Perfect for home temples and spiritual spaces. Made by skilled artisans using traditional techniques."
      },
      {
        name: "Decorative Brass Bowl Set",
        code: "VF-BB-002",
        category: "Home Decor",
        length: 25,
        breadth: 25,
        height: 8,
        finish: "Polished Brass",
        material: "Pure Brass",
        imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        imageUrls: [
          "https://images.unsplash.com/photo-1549497538-303791108f95?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80"
        ],
        description: "Set of 3 decorative brass bowls with traditional engravings. Ideal for serving dry fruits, sweets, or as decorative pieces."
      },
      {
        name: "Brass Diya Oil Lamp",
        code: "VF-DL-003",
        category: "Lighting",
        length: 10,
        breadth: 10,
        height: 5,
        finish: "Traditional Brass",
        material: "Pure Brass",
        imageUrl: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        imageUrls: [
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=85"
        ],
        description: "Traditional brass diya perfect for festivals and daily prayers. Handcrafted with beautiful patterns and smooth finish."
      },
      {
        name: "Ornate Brass Kalash",
        code: "VF-BK-004",
        category: "Religious Items",
        length: 12,
        breadth: 12,
        height: 18,
        finish: "Engraved Brass",
        material: "Pure Brass",
        imageUrl: "https://images.unsplash.com/photo-1549497538-303791108f95?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        imageUrls: [
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80",
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=85"
        ],
        description: "Sacred brass kalash with intricate engravings. Essential for religious ceremonies and puja rituals. Comes with detailed craftsmanship."
      },
      {
        name: "Conference Table",
        code: "VF-CT-005",
        category: "Tables",
        length: 300,
        breadth: 120,
        height: 75,
        finish: "Mahogany",
        material: "Mahogany Wood",
        imageUrl: "https://images.unsplash.com/photo-1549497538-303791108f95?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
      },
      {
        name: "Modular Bookshelf",
        code: "VF-BS-006",
        category: "Storage",
        length: 100,
        breadth: 30,
        height: 200,
        finish: "White Oak",
        material: "White Oak & Metal",
        imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
      },
      {
        name: "Premium Lounge Chair",
        code: "VF-LC-007",
        category: "Chairs",
        length: 80,
        breadth: 85,
        height: 95,
        finish: "Gray Fabric",
        material: "Premium Fabric & Wood",
        imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
      },
      {
        name: "Modern Side Table",
        code: "VF-ST-008",
        category: "Tables",
        length: 45,
        breadth: 45,
        height: 55,
        finish: "Wood & Metal",
        material: "Engineered Wood & Steel",
        imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
      }
    ];

    sampleProducts.forEach(product => {
      const newProduct: Product = {
        ...product,
        id: this.currentProductId++,
        material: product.material || "",
        imageUrl: product.imageUrl || null,
        imageUrls: product.imageUrls || null,
        description: product.description || null,
        status: product.status || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.products.set(newProduct.id, newProduct);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByWhatsApp(whatsappNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.whatsappNumber === whatsappNumber,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      password: null,
      isAdmin: false,
      isPrimaryAdmin: false,
      createdAt: new Date(),
    };
    this.users.set(id, user);

    // Log user data to file for collection
    await this.logUserData(user);

    return user;
  }

  private async logUserData(user: User) {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const userData = {
        timestamp: new Date().toISOString(),
        name: user.name,
        whatsappNumber: user.whatsappNumber,
        id: user.id
      };

      const logEntry = JSON.stringify(userData) + '\n';
      const logPath = path.join(process.cwd(), 'user_data_log.txt');

      fs.appendFileSync(logPath, logEntry);
    } catch (error) {
      console.error('Error logging user data:', error);
    }
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductByCode(code: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(
      (product) => product.code === code,
    );
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const product: Product = {
      ...insertProduct,
      id,
      material: insertProduct.material || "",
      imageUrl: insertProduct.imageUrl || null,
      imageUrls: (insertProduct as any).imageUrls || null,
      description: (insertProduct as any).description || null,
      status: (insertProduct as any).status || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: number, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;

    const updated: Product = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  async searchProducts(query: string, limit?: number, offset?: number): Promise<Product[]> {
    const lowercaseQuery = query.toLowerCase();
    let results = Array.from(this.products.values()).filter(
      (product) =>
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.code.toLowerCase().includes(lowercaseQuery) ||
        product.category.toLowerCase().includes(lowercaseQuery) ||
        product.finish.toLowerCase().includes(lowercaseQuery)
    );

    if (offset !== undefined) {
      results = results.slice(offset);
    }
    if (limit !== undefined) {
      results = results.slice(0, limit);
    }

    return results;
  }

  async getSearchCount(query: string): Promise<number> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.products.values()).filter(
      (product) =>
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.code.toLowerCase().includes(lowercaseQuery) ||
        product.category.toLowerCase().includes(lowercaseQuery) ||
        product.finish.toLowerCase().includes(lowercaseQuery)
    ).length;
  }

  async filterProducts(filters: { category?: string; finish?: string; material?: string; sortBy?: string; limit?: number; offset?: number }): Promise<Product[]> {
    let products = Array.from(this.products.values());

    if (filters.category) {
      products = products.filter(p => p.category === filters.category);
    }

    if (filters.finish) {
      products = products.filter(p => p.finish === filters.finish);
    }

    if (filters.material) {
      products = products.filter(p => p.material === filters.material);
    }

    // Sort products
    switch (filters.sortBy) {
      case 'code':
        products.sort((a, b) => a.code.localeCompare(b.code));
        break;
      case 'category':
        products.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'newest':
        products.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        break;
      default:
        products.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Apply pagination
    if (filters.offset !== undefined) {
      products = products.slice(filters.offset);
    }
    if (filters.limit !== undefined) {
      products = products.slice(0, filters.limit);
    }

    return products;
  }

  async getFilterCount(filters: { category?: string; finish?: string; material?: string }): Promise<number> {
    let products = Array.from(this.products.values());

    if (filters.category) {
      products = products.filter(p => p.category === filters.category);
    }

    if (filters.finish) {
      products = products.filter(p => p.finish === filters.finish);
    }

    if (filters.material) {
      products = products.filter(p => p.material === filters.material);
    }

    return products.length;
  }

  async bulkCreateProducts(insertProducts: InsertProduct[]): Promise<Product[]> {
    const products: Product[] = [];
    for (const insertProduct of insertProducts) {
      const id = this.currentProductId++;
      const product: Product = {
        ...insertProduct,
        id,
        material: insertProduct.material || "",
        imageUrl: insertProduct.imageUrl || null,
        imageUrls: (insertProduct as any).imageUrls || null,
        description: (insertProduct as any).description || null,
        status: (insertProduct as any).status || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.products.set(id, product);
      products.push(product);
    }
    return products;
  }

  async getWishlistByUser(userId: number): Promise<(Wishlist & { product: Product })[]> {
    const userWishlists = Array.from(this.wishlists.values()).filter(
      (wishlist) => wishlist.userId === userId
    );

    return userWishlists.map(wishlist => {
      const product = this.products.get(wishlist.productId);
      if (!product) throw new Error(`Product not found for wishlist item`);
      return { ...wishlist, product };
    });
  }

  async addToWishlist(insertWishlist: InsertWishlist): Promise<Wishlist> {
    const id = this.currentWishlistId++;
    const wishlist: Wishlist = {
      ...insertWishlist,
      id,
      createdAt: new Date(),
    };
    this.wishlists.set(id, wishlist);
    return wishlist;
  }

  async removeFromWishlist(userId: number, productId: number): Promise<boolean> {
    const wishlistItem = Array.from(this.wishlists.values()).find(
      (w) => w.userId === userId && w.productId === productId
    );

    if (!wishlistItem) return false;
    return this.wishlists.delete(wishlistItem.id);
  }

  async isInWishlist(userId: number, productId: number): Promise<boolean> {
    return Array.from(this.wishlists.values()).some(
      (w) => w.userId === userId && w.productId === productId
    );
  }

  // New methods for categories and finishes
  async getCategories(): Promise<string[]> {
    const allProducts = Array.from(this.products.values());
    const categories = new Set<string>();

    allProducts.forEach(product => {
      if (product.category) {
        categories.add(product.category);
      }
    });

    return Array.from(categories);
  }

  async getFinishes(): Promise<string[]> {
    const allProducts = Array.from(this.products.values());
    const finishes = new Set<string>();

    allProducts.forEach(product => {
      if (product.finish) {
        finishes.add(product.finish);
      }
    });

    return Array.from(finishes);
  }

  async getMaterials(): Promise<string[]> {
    const allProducts = Array.from(this.products.values());
    const materials = new Set<string>();

    allProducts.forEach(product => {
      if (product.material) {
        materials.add(product.material);
      }
    });

    return Array.from(materials);
  }

  // Dynamic filter methods that return only available options based on current selections
  async getAvailableCategories(filters: { finish?: string; material?: string }): Promise<string[]> {
    let products = Array.from(this.products.values());

    // Filter products based on current selections
    if (filters.finish) {
      products = products.filter(p => p.finish === filters.finish);
    }
    if (filters.material) {
      products = products.filter(p => p.material === filters.material);
    }

    // Get unique categories from filtered products
    const categories = new Set<string>();
    products.forEach(product => {
      if (product.category) {
        categories.add(product.category);
      }
    });

    return Array.from(categories).sort();
  }

  async getAvailableFinishes(filters: { category?: string; material?: string }): Promise<string[]> {
    let products = Array.from(this.products.values());

    // Filter products based on current selections
    if (filters.category) {
      products = products.filter(p => p.category === filters.category);
    }
    if (filters.material) {
      products = products.filter(p => p.material === filters.material);
    }

    // Get unique finishes from filtered products
    const finishes = new Set<string>();
    products.forEach(product => {
      if (product.finish) {
        finishes.add(product.finish);
      }
    });

    return Array.from(finishes).sort();
  }

  async getAvailableMaterials(filters: { category?: string; finish?: string }): Promise<string[]> {
    let products = Array.from(this.products.values());

    // Filter products based on current selections
    if (filters.category) {
      products = products.filter(p => p.category === filters.category);
    }
    if (filters.finish) {
      products = products.filter(p => p.finish === filters.finish);
    }

    // Get unique materials from filtered products
    const materials = new Set<string>();
    products.forEach(product => {
      if (product.material) {
        materials.add(product.material);
      }
    });

    return Array.from(materials).sort();
  }

  // Add new method to get all users
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserPassword(id: number, password: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    user.password = password;
    this.users.set(id, user);
    return true;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    // Don't allow changing primary admin status unless by a primary admin
    if (data.isPrimaryAdmin !== undefined && !user.isPrimaryAdmin) {
      data.isPrimaryAdmin = false;
    }

    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    // Don't allow deleting primary admin
    const user = this.users.get(id);
    if (!user || user.isPrimaryAdmin) return false;

    return this.users.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByWhatsApp(whatsappNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.whatsappNumber, whatsappNumber));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();

    // Log user data to file for collection
    await this.logUserData(user);

    return user;
  }

  private async logUserData(user: User) {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const userData = {
        timestamp: new Date().toISOString(),
        name: user.name,
        whatsappNumber: user.whatsappNumber,
        id: user.id
      };

      const logEntry = JSON.stringify(userData) + '\n';
      const logPath = path.join(process.cwd(), 'user_data_log.txt');

      fs.appendFileSync(logPath, logEntry);
    } catch (error) {
      console.error('Error logging user data:', error);
    }
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductByCode(code: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.code, code));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        ...insertProduct,
        imageUrl: insertProduct.imageUrl || null
      })
      .returning();
    return product;
  }

  async updateProduct(id: number, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({
        ...updateData,
        imageUrl: updateData.imageUrl || null,
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount > 0;
  }

  async searchProducts(query: string, limit?: number, offset?: number): Promise<Product[]> {
    const lowercaseQuery = `%${query.toLowerCase()}%`;
    let searchQuery = db.select().from(products).where(
      or(
        sql`LOWER(${products.name}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.code}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.category}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.finish}) LIKE ${lowercaseQuery}`
      )
    );

    if (limit !== undefined) {
      searchQuery = searchQuery.limit(limit);
    }
    if (offset !== undefined) {
      searchQuery = searchQuery.offset(offset);
    }

    return await searchQuery;
  }

  async getSearchCount(query: string): Promise<number> {
    const lowercaseQuery = `%${query.toLowerCase()}%`;
    const result = await db.select({ count: sql<number>`count(*)` }).from(products).where(
      or(
        sql`LOWER(${products.name}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.code}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.category}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.finish}) LIKE ${lowercaseQuery}`
      )
    );
    return result[0]?.count || 0;
  }

  async filterProducts(filters: { category?: string; finish?: string; material?: string; sortBy?: string; limit?: number; offset?: number }): Promise<Product[]> {
    let query = db.select().from(products);

    // Build WHERE conditions
    const conditions = [];

    if (filters.category) {
      conditions.push(eq(products.category, filters.category));
    }

    if (filters.finish) {
      conditions.push(eq(products.finish, filters.finish));
    }

    if (filters.material) {
      conditions.push(eq(products.material, filters.material));
    }

    // Apply WHERE conditions if any
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    // Apply ORDER BY
    switch (filters.sortBy) {
      case 'code':
        query = query.orderBy(asc(products.code));
        break;
      case 'category':
        query = query.orderBy(asc(products.category));
        break;
      case 'newest':
        query = query.orderBy(desc(products.createdAt));
        break;
      default:
        query = query.orderBy(asc(products.name));
    }

    // Apply pagination
    if (filters.limit !== undefined) {
      query = query.limit(filters.limit);
    }
    if (filters.offset !== undefined) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async getFilterCount(filters: { category?: string; finish?: string; material?: string }): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)` }).from(products);

    // Build WHERE conditions
    const conditions = [];

    if (filters.category) {
      conditions.push(eq(products.category, filters.category));
    }

    if (filters.finish) {
      conditions.push(eq(products.finish, filters.finish));
    }

    if (filters.material) {
      conditions.push(eq(products.material, filters.material));
    }

    // Apply WHERE conditions if any
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    const result = await query;
    return result[0]?.count || 0;
  }

  async bulkCreateProducts(insertProducts: InsertProduct[]): Promise<Product[]> {
    const formattedProducts = insertProducts.map(p => ({
      ...p,
      imageUrl: p.imageUrl || null
    }));

    const createdProducts = await db
      .insert(products)
      .values(formattedProducts)
      .returning();

    return createdProducts;
  }

  async getWishlistByUser(userId: number): Promise<(Wishlist & { product: Product })[]> {
    const wishlistWithProducts = await db
      .select({
        id: wishlists.id,
        userId: wishlists.userId,
        productId: wishlists.productId,
        createdAt: wishlists.createdAt,
        product: products
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .where(eq(wishlists.userId, userId));

    return wishlistWithProducts;
  }

  async addToWishlist(insertWishlist: InsertWishlist): Promise<Wishlist> {
    const [wishlist] = await db
      .insert(wishlists)
      .values(insertWishlist)
      .returning();
    return wishlist;
  }

  async removeFromWishlist(userId: number, productId: number): Promise<boolean> {
    const result = await db
      .delete(wishlists)
      .where(eq(wishlists.userId, userId) && eq(wishlists.productId, productId));
    return result.rowCount > 0;
  }

  async isInWishlist(userId: number, productId: number): Promise<boolean> {
    const [wishlistItem] = await db
      .select()
      .from(wishlists)
      .where(eq(wishlists.userId, userId) && eq(wishlists.productId, productId));
    return !!wishlistItem;
  }

  // New methods for categories and finishes
  async getCategories(): Promise<string[]> {
    const result = await db.selectDistinct({ category: products.category }).from(products);
    return result.map((r: any) => r.category).filter(Boolean);
  }

  async getFinishes(): Promise<string[]> {
    const result = await db.selectDistinct({ finish: products.finish }).from(products);
    return result.map((r: any) => r.finish).filter(Boolean);
  }

  async getMaterials(): Promise<string[]> {
    const result = await db.selectDistinct({ material: products.material }).from(products);
    return result.map((r: any) => r.material).filter(Boolean);
  }

  // Add new method to get all users
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserPassword(id: number, password: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    // Check if user exists and is primary admin if trying to modify admin privileges
    if (data.isPrimaryAdmin !== undefined || data.isAdmin !== undefined) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) return undefined;

      // Don't allow changing primary admin status unless by another primary admin
      if (data.isPrimaryAdmin !== undefined && !user.isPrimaryAdmin) {
        data.isPrimaryAdmin = false;
      }
    }

    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    // Check if user is primary admin
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user || user.isPrimaryAdmin) return false;

    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  // Dynamic filter methods that return only available options based on current selections
  async getAvailableCategories(filters: { finish?: string; material?: string }): Promise<string[]> {
    let query = db.selectDistinct({ category: products.category }).from(products);

    const conditions = [];
    if (filters.finish) {
      conditions.push(eq(products.finish, filters.finish));
    }
    if (filters.material) {
      conditions.push(eq(products.material, filters.material));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query;
    return result.map((r: any) => r.category).filter(Boolean).sort();
  }

  async getAvailableFinishes(filters: { category?: string; material?: string }): Promise<string[]> {
    let query = db.selectDistinct({ finish: products.finish }).from(products);

    const conditions = [];
    if (filters.category) {
      conditions.push(eq(products.category, filters.category));
    }
    if (filters.material) {
      conditions.push(eq(products.material, filters.material));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query;
    return result.map((r: any) => r.finish).filter(Boolean).sort();
  }

  async getAvailableMaterials(filters: { category?: string; finish?: string }): Promise<string[]> {
    let query = db.selectDistinct({ material: products.material }).from(products);

    const conditions = [];
    if (filters.category) {
      conditions.push(eq(products.category, filters.category));
    }
    if (filters.finish) {
      conditions.push(eq(products.finish, filters.finish));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query;
    return result.map((r: any) => r.material).filter(Boolean).sort();
  }
}

// Use MemStorage in development mode and DatabaseStorage in production
const isDev = process.env.NODE_ENV === 'development';

export const storage = isDev ? new MemStorage() : new DatabaseStorage();

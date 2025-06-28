import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  whatsappNumber: text("whatsapp_number").notNull().unique(),
  city: text("city").notNull(),
  password: text("password"),
  isAdmin: boolean("is_admin").default(false),
  isPrimaryAdmin: boolean("is_primary_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  category: text("category").notNull(),
  length: real("length").notNull(), // in cm
  breadth: real("breadth").notNull(), // in cm
  height: real("height").notNull(), // in cm
  finish: text("finish").notNull(),
  material: text("material").default("").notNull(),
  imageUrl: text("image_url"),
  imageUrls: text("image_urls").array(), // Multiple images
  description: text("description"), // Product description
  status: text("status").default("active"), // active, inactive, draft
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wishlists = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  rating: integer("rating").notNull(), // 1-5 stars
  title: text("title").notNull(),
  message: text("message").notNull(),
  isApproved: boolean("is_approved").default(false),
  isPublished: boolean("is_published").default(false),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  wishlists: many(wishlists),
}));

export const productsRelations = relations(products, ({ many }) => ({
  wishlists: many(wishlists),
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [wishlists.productId],
    references: [products.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  whatsappNumber: true,
  city: true,
});

export const adminLoginSchema = z.object({
  whatsappNumber: z.string().min(1),
  password: z.string().min(6),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWishlistSchema = createInsertSchema(wishlists).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Wishlist = typeof wishlists.$inferSelect;
export type InsertWishlist = z.infer<typeof insertWishlistSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

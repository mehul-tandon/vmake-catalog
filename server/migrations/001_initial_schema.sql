-- Initial database schema for VMake Catalog
-- This creates the base tables for users, products, and wishlists

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "whatsapp_number" TEXT NOT NULL UNIQUE,
  "password" TEXT,
  "is_admin" BOOLEAN DEFAULT FALSE,
  "is_primary_admin" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS "products" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "category" TEXT NOT NULL,
  "length" REAL NOT NULL DEFAULT 0,
  "breadth" REAL NOT NULL DEFAULT 0,
  "height" REAL NOT NULL DEFAULT 0,
  "finish" TEXT NOT NULL,
  "material" TEXT DEFAULT '' NOT NULL,
  "image_url" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Wishlists table
CREATE TABLE IF NOT EXISTS "wishlists" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
);

-- User sessions table for express-session
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" VARCHAR NOT NULL PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_users_whatsapp" ON "users"("whatsapp_number");
CREATE INDEX IF NOT EXISTS "idx_products_code" ON "products"("code");
CREATE INDEX IF NOT EXISTS "idx_products_category" ON "products"("category");
CREATE INDEX IF NOT EXISTS "idx_products_finish" ON "products"("finish");
CREATE INDEX IF NOT EXISTS "idx_products_material" ON "products"("material");
CREATE INDEX IF NOT EXISTS "idx_wishlists_user_id" ON "wishlists"("user_id");
CREATE INDEX IF NOT EXISTS "idx_wishlists_product_id" ON "wishlists"("product_id");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_expire" ON "user_sessions"("expire");

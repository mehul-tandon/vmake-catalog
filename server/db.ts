import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// For local development without a real database
const isDev = process.env.NODE_ENV === 'development';

let pool: Pool | null = null;
let db: any;

// Use memory store for local development
if (isDev && !process.env.DATABASE_URL) {
  console.warn("Running with mock database for local development");
  // Create a mock database implementation
  pool = null;
  db = {
    query: async () => [],
    select: () => ({ from: () => [] }),
    insert: () => ({ values: () => ({ returning: () => [] }) }),
    delete: () => ({ where: () => ({ returning: () => [] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
  };
} else {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });
  
  db = drizzle({ client: pool, schema });
}

export { pool, db };

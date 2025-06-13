// This script creates a primary admin user for production deployment
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema.js";
import { users } from "../shared/schema.js";
import { eq } from "drizzle-orm";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function setupAdmin() {
  try {
    console.log('===== VMake Finessee Admin Setup =====');

    // Check if primary admin already exists
    const existingAdmin = await db.select().from(users).where(eq(users.isPrimaryAdmin, true)).limit(1);

    if (existingAdmin.length > 0) {
      console.log(`Primary admin already exists: ${existingAdmin[0].name} (${existingAdmin[0].whatsappNumber})`);
      console.log('Database setup complete.');
      await pool.end();
      return;
    }

    // Create primary admin
    const adminWhatsApp = process.env.ADMIN_WHATSAPP || '+1234567890';
    const newAdmin = await db.insert(users).values({
      name: 'Admin User',
      whatsappNumber: adminWhatsApp,
      password: null, // Will be set on first login
      isAdmin: true,
      isPrimaryAdmin: true,
    }).returning();

    console.log(`\nPrimary admin created successfully!`);
    console.log(`Name: ${newAdmin[0].name}`);
    console.log(`WhatsApp: ${newAdmin[0].whatsappNumber}`);
    console.log('\nThe admin can set their password on first login.');

    await pool.end();
  } catch (error) {
    console.error('Error setting up admin:', error.message);
    await pool.end();
    process.exit(1);
  }
}

setupAdmin();
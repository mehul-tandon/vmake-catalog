#!/usr/bin/env node

// Simple database initialization script for production deployment
// This can be run manually if the automatic initialization fails

import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🚀 Starting database initialization...');

    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();

    // Create migrations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Migrations table ready');

    // Get executed migrations
    const executedResult = await pool.query('SELECT filename FROM migrations ORDER BY id');
    const executedMigrations = new Set(executedResult.rows.map(row => row.filename));

    // Find migration files
    const migrationsDir = path.join(__dirname, '..', 'server', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${migrationFiles.length} migration files`);

    // Execute pending migrations
    for (const filename of migrationFiles) {
      if (executedMigrations.has(filename)) {
        console.log(`⏭️  Migration ${filename} already executed, skipping`);
        continue;
      }

      console.log(`🔄 Executing migration: ${filename}`);
      
      const filePath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filePath, 'utf8');

      const migrationClient = await pool.connect();
      try {
        await migrationClient.query('BEGIN');
        await migrationClient.query(sql);
        await migrationClient.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename]
        );
        await migrationClient.query('COMMIT');
        console.log(`✅ Migration ${filename} executed successfully`);
      } catch (error) {
        await migrationClient.query('ROLLBACK');
        console.error(`❌ Migration ${filename} failed:`, error.message);
        throw error;
      } finally {
        migrationClient.release();
      }
    }

    // Create primary admin if needed
    const adminCheck = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE is_primary_admin = true'
    );
    
    if (parseInt(adminCheck.rows[0].count) === 0) {
      console.log('👤 Creating primary admin user...');
      
      const adminWhatsApp = process.env.ADMIN_WHATSAPP || '+918882636296';
      await pool.query(`
        INSERT INTO users (name, whatsapp_number, password, is_admin, is_primary_admin)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (whatsapp_number) DO UPDATE SET
          is_admin = true,
          is_primary_admin = true
      `, ['Admin User', adminWhatsApp, null, true, true]);
      
      console.log(`✅ Primary admin created with WhatsApp: ${adminWhatsApp}`);
    } else {
      console.log('👤 Primary admin already exists');
    }

    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('💥 Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the initialization
initDatabase();

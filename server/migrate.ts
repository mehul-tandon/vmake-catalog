import fs from 'fs';
import path from 'path';
import { pool } from './db';

interface Migration {
  id: number;
  filename: string;
  sql: string;
}

export async function runMigrations(): Promise<void> {
  if (!pool) {
    console.log('No database pool available, skipping migrations');
    return;
  }

  try {
    console.log('Starting database migrations...');

    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Get list of executed migrations
    const executedResult = await pool.query('SELECT filename FROM migrations ORDER BY id');
    const executedMigrations = new Set(executedResult.rows.map(row => row.filename));

    // Get migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found, skipping migrations');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration files`);

    // Execute pending migrations
    for (const filename of migrationFiles) {
      if (executedMigrations.has(filename)) {
        console.log(`Migration ${filename} already executed, skipping`);
        continue;
      }

      console.log(`Executing migration: ${filename}`);
      
      const filePath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Execute migration in a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Execute the migration SQL
        await client.query(sql);
        
        // Record the migration as executed
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename]
        );
        
        await client.query('COMMIT');
        console.log(`Migration ${filename} executed successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Migration ${filename} failed:`, error);
        throw error;
      } finally {
        client.release();
      }
    }

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

export async function initializeDatabase(): Promise<void> {
  if (!pool) {
    console.log('No database pool available, skipping database initialization');
    return;
  }

  try {
    console.log('Initializing database...');
    
    // Run migrations first
    await runMigrations();
    
    // Check if we need to create a primary admin
    const adminCheck = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE is_primary_admin = true'
    );
    
    if (parseInt(adminCheck.rows[0].count) === 0) {
      console.log('Creating primary admin user...');
      
      const adminWhatsApp = process.env.ADMIN_WHATSAPP || '+918882636296';
      await pool.query(`
        INSERT INTO users (name, whatsapp_number, password, is_admin, is_primary_admin)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (whatsapp_number) DO UPDATE SET
          is_admin = true,
          is_primary_admin = true
      `, ['Admin User', adminWhatsApp, null, true, true]);
      
      console.log(`Primary admin created with WhatsApp: ${adminWhatsApp}`);
    } else {
      console.log('Primary admin already exists');
    }
    
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

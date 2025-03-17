#!/usr/bin/env node

// Register ts-node to handle TypeScript files
// This is needed when running directly with node
try {
  require('ts-node').register({
    project: 'tsconfig.node.json',
    transpileOnly: true,
    compilerOptions: {
      module: 'CommonJS',
    },
  });
} catch (e) {
  console.log('ts-node not available, assuming TypeScript is already compiled');
}

// Import reflect-metadata for decorators
import 'reflect-metadata';

import { Pool } from 'pg';
import {
  loadEntityClasses,
  generateMigrationSQL,
  getCurrentSchema,
} from './migration';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// We'll rely on the loadEntityClasses function to dynamically load all entity classes
// This prevents cross-contamination between entity classes

/**
 * Ensure the vector extension is installed
 */
export async function ensureVectorExtension(pool: Pool): Promise<void> {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('Vector extension is installed or already exists.');
  } catch (error) {
    console.error('Error ensuring vector extension:', error);
    throw error;
  }
}

/**
 * Run the migration
 * @param pool The database connection pool to use
 * @param dryRun If true, only show the SQL that would be executed without actually running it
 * @param entityClasses Optional array of entity classes to use for migration (if not provided, will load from db/entities)
 */
export async function runMigration(
  pool?: Pool,
  dryRun: boolean = false,
  entityClasses?: any[]
): Promise<string> {
  let shouldClosePool = false;
  let migrationSql = '';

  try {
    // If no pool is provided, create one from DATABASE_URL
    if (!pool) {
      // Check if DATABASE_URL is set
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      // Create a connection pool
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      shouldClosePool = true;
    }

    // Start transaction
    const client = await pool.connect();

    try {
      if (!dryRun) {
        await client.query('BEGIN');
      }

      // Ensure vector extension is installed
      if (!dryRun) {
        await ensureVectorExtension(pool);
      } else {
        console.log('Vector extension would be installed (dry run)');
      }

      // Load entity classes if not provided
      if (!entityClasses) {
        entityClasses = await loadEntityClasses();
      }
      console.log(`Loaded ${entityClasses.length} entity classes`);

      // Get current schema
      const currentSchema = await getCurrentSchema(pool);
      console.log(
        `Retrieved current schema with ${
          Object.keys(currentSchema).length
        } tables`
      );

      // Generate migration SQL
      migrationSql = generateMigrationSQL(entityClasses, currentSchema);

      // Check if there are any changes to apply
      if (migrationSql.trim() === 'CREATE EXTENSION IF NOT EXISTS vector;') {
        console.log('No schema changes needed, database is up to date');
      } else {
        if (dryRun) {
          console.log('DRY RUN: The following SQL would be executed:');
          console.log(migrationSql);
          console.log('No changes were made to the database (dry run)');
        } else {
          console.log('Executing migration SQL:');
          console.log(migrationSql);

          // Execute migration
          await client.query(migrationSql);
          console.log(`Migration completed`);
        }
      }

      if (!dryRun) {
        await client.query('COMMIT');
      }
    } catch (error) {
      if (!dryRun) {
        await client.query('ROLLBACK');
      }
      console.error('Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  } finally {
    // Only close the pool if we created it
    if (shouldClosePool && pool) {
      await pool.end();
    }
  }

  return migrationSql;
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration().catch(error => {
    console.error('Unhandled error during migration:', error);
    process.exit(1);
  });
}

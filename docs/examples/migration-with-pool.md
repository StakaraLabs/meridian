# Using the Database Pool with Migrations

This example demonstrates how to update the migration system to use the new database pool initialization approach.

## Updating the Migration Script

Here's how to modify the `run-migration.ts` script to use the new pool initialization:

```typescript
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
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Import the pool functions
import { initializePool, getPool } from '../sql/types';
import {
  loadEntityClasses,
  generateMigrationSQL,
  getCurrentSchema,
} from './migration';

// Load environment variables
dotenv.config();

/**
 * Ensure the vector extension is installed
 */
export async function ensureVectorExtension(): Promise<void> {
  const pool = getPool();
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
 * @param options Migration options
 */
export async function runMigration(options: { 
  dryRun?: boolean;
  verbose?: boolean;
} = {}): Promise<void> {
  const { dryRun = false, verbose = false } = options;
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Initialize the pool if it hasn't been initialized yet
  if (!global.poolInitialized) {
    initializePool({
      connectionString: process.env.DATABASE_URL,
    });
    global.poolInitialized = true;
  }

  // Get the pool
  const pool = getPool();

  try {
    // Start transaction
    const client = await pool.connect();

    try {
      if (!dryRun) {
        await client.query('BEGIN');
      }

      // Ensure vector extension is installed
      if (!dryRun) {
        await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
        if (verbose) {
          console.log('Vector extension is installed or already exists.');
        }
      } else if (verbose) {
        console.log('Vector extension would be installed (dry run)');
      }

      // Load entity classes
      const entityClasses = await loadEntityClasses();
      console.log(`Loaded ${entityClasses.length} entity classes`);

      // Get current schema
      const currentSchema = await getCurrentSchema(pool);
      console.log(
        `Retrieved current schema with ${
          Object.keys(currentSchema).length
        } tables`
      );

      // Generate migration SQL
      const sql = generateMigrationSQL(entityClasses, currentSchema);

      // Check if there are any changes to apply
      if (sql.trim() === 'CREATE EXTENSION IF NOT EXISTS vector;') {
        console.log('No schema changes needed, database is up to date');
      } else {
        if (dryRun) {
          console.log('DRY RUN: The following SQL would be executed:');
          console.log(sql);
          console.log('No changes were made to the database (dry run)');
        } else {
          if (verbose) {
            console.log('Executing migration SQL:');
            console.log(sql);
          } else {
            console.log('Executing migration...');
          }

          // Execute migration
          await client.query(sql);
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
      process.exit(1);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Unhandled error during migration:', error);
    process.exit(1);
  }
  
  // Note: We don't end the pool here, as it might be used by other parts of the application
  // If you want to end the process after migration, you can call process.exit(0) here
}

// Run the migration if this file is executed directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const verbose = args.includes('--verbose') || args.includes('-v');
  
  runMigration({ dryRun, verbose }).catch(error => {
    console.error('Unhandled error during migration:', error);
    process.exit(1);
  });
}
```

## Creating a CLI Tool

You can create a dedicated CLI tool for running migrations:

```typescript
#!/usr/bin/env node
// bin/meridian-migrate.js

const { runMigration } = require('../dist/sql/run-migration');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('dry-run', {
    alias: 'd',
    type: 'boolean',
    description: 'Show SQL without executing it'
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Show detailed logs'
  })
  .help()
  .argv;

runMigration({ 
  dryRun: argv.dryRun, 
  verbose: argv.verbose 
}).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
```

Then add it to your package.json:

```json
{
  "bin": {
    "meridian-migrate": "./bin/meridian-migrate.js"
  }
}
```

## Integration with Next.js

Here's how to integrate migrations with a Next.js application:

```typescript
// lib/db.ts
import { initializePool, getPool } from 'meridian';
import { runMigration } from 'meridian/migrations';

let initialized = false;

export async function initializeDatabase() {
  if (initialized) return getPool();
  
  // Initialize the pool
  initializePool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === 'production' ? 20 : 5
  });
  
  // Run migrations if AUTO_MIGRATE is enabled
  if (process.env.AUTO_MIGRATE === 'true') {
    try {
      await runMigration({ verbose: process.env.NODE_ENV !== 'production' });
      console.log('Database migration completed successfully');
    } catch (err) {
      console.error('Database migration failed:', err);
      // In production, you might want to handle this differently
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
  
  initialized = true;
  return getPool();
}

// For convenience, also export getPool directly
export { getPool };
```

Then in your application:

```typescript
// app/api/_init.ts
import { initializeDatabase } from '@/lib/db';

// This will be executed when the app starts
initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

export const runtime = 'nodejs';
```

## Running Migrations in CI/CD

For CI/CD pipelines, you can create a script to run migrations before deployment:

```bash
#!/bin/bash
# scripts/migrate.sh

# Load environment variables
set -a
source .env.production
set +a

# Run migration
echo "Running database migrations..."
npx meridian-migrate --verbose

# Check if migration was successful
if [ $? -eq 0 ]; then
  echo "Migration completed successfully"
  exit 0
else
  echo "Migration failed"
  exit 1
fi
```

Then in your CI/CD configuration (e.g., GitHub Actions):

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run database migrations
        run: ./scripts/migrate.sh
      - name: Deploy application
        if: success()
        run: npm run deploy
```

## Best Practices

1. **Environment Variables**: Use environment variables for database connection strings
2. **Dry Run in Production**: Always do a dry run before applying migrations in production
3. **Transaction Safety**: Ensure migrations run in a transaction for atomicity
4. **Logging**: Enable verbose logging in development for debugging
5. **Error Handling**: Properly handle migration errors, especially in production
6. **Backup**: Always back up your database before running migrations in production 
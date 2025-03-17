# Automatic Database Migrations

Meridian provides a powerful system for automatically generating and applying database migrations based on your entity definitions. This approach eliminates the need to write SQL migration scripts manually, making schema changes simpler and less error-prone.

## How It Works

The migration system works by:

1. Loading all entity class definitions from your codebase
2. Comparing them with the current database schema
3. Generating the necessary SQL to transform the database to match your entity definitions
4. Applying these changes in a single transaction

## Setting Up Migrations

### 1. Define Your Entities

First, define your entity classes with proper decorators:

```typescript
import { Entity, Column, PrimaryColumn } from 'meridian/decorators';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
```

### 2. Running Migrations

You can run migrations programmatically or via the command line.

#### Command Line

```bash
# Run migration
npx meridian-migrate

# Dry run (show SQL without applying changes)
npx meridian-migrate --dry-run
```

#### Programmatically

```typescript
import { initializePool, getPool } from 'meridian';
import { runMigration } from 'meridian/migrations';

// Initialize the database pool
initializePool();

// Run migration
await runMigration();

// Or with dry run option
await runMigration({ dryRun: true });
```

## Migration Configuration

You can configure the migration system by creating a `meridian.config.js` file in your project root:

```javascript
module.exports = {
  // Directory where entity classes are located
  entitiesDir: 'src/entities',
  
  // Database connection options (if not using the pool)
  database: {
    connectionString: process.env.DATABASE_URL,
  },
  
  // Migration options
  migrations: {
    // Whether to automatically create tables that don't exist
    createTables: true,
    
    // Whether to automatically add columns that don't exist
    addColumns: true,
    
    // Whether to automatically alter columns that have changed
    alterColumns: true,
    
    // Whether to automatically create indices
    createIndices: true,
    
    // Whether to drop columns that no longer exist in the entity
    // CAUTION: This can cause data loss
    dropColumns: false,
    
    // Whether to drop tables that no longer exist in any entity
    // CAUTION: This can cause data loss
    dropTables: false,
  }
};
```

## Advanced Usage

### Vector Support

Meridian supports PostgreSQL vector extensions for AI and machine learning applications:

```typescript
import { Entity, Column, PrimaryColumn, VectorColumn } from 'meridian/decorators';

@Entity('documents')
export class Document {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'text' })
  content: string;

  @VectorColumn({ dimensions: 1536 })
  embedding: number[];
}
```

The migration system will automatically install the vector extension if needed.

### Transaction Safety

All migrations run within a transaction, ensuring that your database remains in a consistent state. If any part of the migration fails, all changes are rolled back.

### Custom SQL

You can include custom SQL in your migrations:

```typescript
import { runMigration, addCustomSQL } from 'meridian/migrations';

// Add custom SQL to be executed during migration
addCustomSQL('CREATE INDEX IF NOT EXISTS idx_users_name ON users (name);');

// Run migration with custom SQL included
await runMigration();
```

## Implementation Details

The migration system follows these steps:

1. **Load Entity Classes**: Dynamically loads all entity classes from your codebase
2. **Extract Schema Information**: Extracts table and column definitions from entity decorators
3. **Get Current Schema**: Queries the database to get the current schema
4. **Generate Migration SQL**: Compares the desired schema with the current schema and generates SQL
5. **Execute Migration**: Runs the generated SQL within a transaction

## Best Practices

1. **Always Run in Development First**: Test migrations in development before applying to production
2. **Use Dry Run**: Use the `--dry-run` option to preview changes before applying them
3. **Back Up Your Database**: Always back up your database before running migrations in production
4. **Be Cautious with Drop Options**: Enabling `dropColumns` or `dropTables` can cause data loss
5. **Version Control**: Keep your entity definitions in version control to track schema changes

## Troubleshooting

### Common Issues

1. **Entity Not Found**: Ensure your entity classes are properly exported and located in the configured directory
2. **Migration Fails**: Check the error message for details on why the migration failed
3. **Vector Extension**: If using vector columns, ensure your PostgreSQL server supports the vector extension

### Debugging

Enable detailed logging to debug migration issues:

```typescript
import { runMigration } from 'meridian/migrations';

await runMigration({ 
  dryRun: true,
  verbose: true 
});
```

## Example: Complete Migration Workflow

Here's a complete example of how to set up and run migrations in a Next.js application:

```typescript
// src/lib/db.ts
import { initializePool, getPool } from 'meridian';
import { runMigration } from 'meridian/migrations';

// Initialize the pool
export function initializeDatabase() {
  // Initialize the connection pool
  initializePool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === 'production' ? 20 : 5
  });
  
  // Run migrations if AUTO_MIGRATE is enabled
  if (process.env.AUTO_MIGRATE === 'true') {
    runMigration()
      .then(() => console.log('Database migration completed'))
      .catch(err => console.error('Database migration failed:', err));
  }
  
  return getPool();
}

export { getPool };
```

Then in your application startup:

```typescript
// app/api/_init.ts
import { initializeDatabase } from '@/lib/db';

// Initialize database and run migrations if configured
initializeDatabase();

export const runtime = 'nodejs';
``` 
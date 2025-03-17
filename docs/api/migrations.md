# Migrations API

This document provides detailed information about the migration system API in Meridian.

## Core Migration Functions

### `runMigration(pool: Pool, dryRun: boolean, entities: any[]): Promise<string | void>`

Runs database migrations based on entity definitions.

**Parameters:**
- `pool`: Database connection pool
- `dryRun`: If true, returns the SQL without executing it
- `entities`: Array of entity classes to migrate

**Returns:**
- If `dryRun` is true, returns the SQL as a string
- If `dryRun` is false, executes the migrations and returns void

**Example:**
```typescript
import { runMigration } from 'meridian-sql/sql/run-migration';
import { User, Post, Comment } from './entities';

// Execute migrations
await runMigration(pool, false, [User, Post, Comment]);

// Dry run to see the SQL
const sql = await runMigration(pool, true, [User, Post, Comment]);
console.log(sql);
```

### `generateMigrationSQL(entities: any[], currentSchema: SchemaInfo): string`

Generates SQL for migrations based on entity definitions and current schema.

**Parameters:**
- `entities`: Array of entity classes to migrate
- `currentSchema`: Current database schema information

**Returns:**
- SQL string for the migration

**Example:**
```typescript
import { generateMigrationSQL } from 'meridian-sql/sql/run-migration';
import { getCurrentSchema } from 'meridian-sql/sql/schema-info';
import { User, Post, Comment } from './entities';

const currentSchema = await getCurrentSchema(pool);
const sql = generateMigrationSQL([User, Post, Comment], currentSchema);
console.log(sql);
```

### `getCurrentSchema(pool: Pool): Promise<SchemaInfo>`

Gets the current database schema information.

**Parameters:**
- `pool`: Database connection pool

**Returns:**
- Current schema information including tables, columns, and constraints

**Example:**
```typescript
import { getCurrentSchema } from 'meridian-sql/sql/schema-info';

const schema = await getCurrentSchema(pool);
console.log(schema.tables);
```

## Schema Comparison Functions

### `compareSchemas(entities: any[], currentSchema: SchemaInfo): SchemaDiff`

Compares entity definitions with the current database schema.

**Parameters:**
- `entities`: Array of entity classes
- `currentSchema`: Current database schema information

**Returns:**
- Schema differences including tables to create, columns to add, etc.

**Example:**
```typescript
import { compareSchemas } from 'meridian-sql/sql/schema-diff';
import { getCurrentSchema } from 'meridian-sql/sql/schema-info';
import { User, Post, Comment } from './entities';

const currentSchema = await getCurrentSchema(pool);
const diff = compareSchemas([User, Post, Comment], currentSchema);
console.log(diff);
```

## Triggering Migrations Manually

Migrations in Meridian need to be triggered manually from your codebase. Here are common patterns for different environments:

### In a Server Application

```typescript
// src/db/migrate.ts
import { Pool } from 'pg';
import { runMigration } from 'meridian-sql/sql/run-migration';
import * as entities from './entities';

export async function migrateDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Get all entity classes
    const entityClasses = Object.values(entities).filter(
      entity => typeof entity === 'function'
    );
    
    // Run migrations
    await runMigration(pool, false, entityClasses);
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Database migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
```

### In a Next.js Application

```typescript
// lib/db.ts
import { Pool } from 'pg';
import { runMigration } from 'meridian-sql/sql/run-migration';
import * as entities from '../db/entities';

let pool: Pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }
  return pool;
}

export async function migrateDatabase() {
  const pool = getPool();
  const entityClasses = Object.values(entities).filter(
    entity => typeof entity === 'function'
  );
  await runMigration(pool, false, entityClasses);
}
```

Then call `migrateDatabase()` during app initialization or in an API route:

```typescript
// app/api/migrate/route.ts
import { migrateDatabase } from '@/lib/db';

export async function GET() {
  try {
    await migrateDatabase();
    return Response.json({ success: true });
  } catch (error) {
    console.error('Migration failed:', error);
    return Response.json(
      { error: 'Migration failed' },
      { status: 500 }
    );
  }
}
```

## Migration Strategies

### Adding New Tables

When a new entity class is defined, Meridian will create a new table with all the defined columns.

```typescript
import { Table, Column } from 'meridian-sql/sql/decorators';
import { BaseEntity } from 'meridian-sql/sql/base-entity';

@Table({ name: 'products' })
export class Product extends BaseEntity {
  @Column()
  name: string;
  
  @Column({ type: 'numeric' })
  price: number;
  
  @Column({ nullable: true })
  description?: string;
}
```

### Adding New Columns

When new properties are added to an existing entity class, Meridian will add the corresponding columns to the table.

```typescript
@Table({ name: 'users' })
export class User extends BaseEntity {
  // Existing columns
  @Column({ unique: true })
  email: string;
  
  // New column
  @Column({ nullable: true })
  phoneNumber?: string;
}
```

### Modifying Columns

Meridian can modify column properties like nullability and uniqueness.

```typescript
@Table({ name: 'users' })
export class User extends BaseEntity {
  // Changed from nullable: true to nullable: false
  @Column({ nullable: false })
  email: string;
}
```

### Adding Indices

Indices can be added using the `@Index` decorator.

```typescript
import { Table, Column, Index } from 'meridian-sql/sql/decorators';
import { BaseEntity } from 'meridian-sql/sql/base-entity';

@Table({ name: 'users' })
@Index(['email', 'username'], { unique: true })
export class User extends BaseEntity {
  @Column()
  email: string;
  
  @Column()
  username: string;
}
```

## Best Practices

1. **Run Migrations During Deployment**: Integrate migrations into your deployment process.
2. **Version Control**: Keep entity definitions in version control to track schema changes.
3. **Test Migrations**: Use dry-run mode to test migrations before applying them.
4. **Backup Database**: Always backup your database before running migrations in production.
5. **Incremental Changes**: Make small, incremental changes to your schema rather than large, sweeping changes. 
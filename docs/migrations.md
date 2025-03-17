# Automatic Database Migrations

Meridian provides an automatic migration system that can generate and execute SQL migrations based on your entity definitions. This document explains how to use this system effectively.

## How It Works

The migration system works by:

1. Loading your entity class definitions
2. Querying the current database schema
3. Comparing the two to generate the necessary SQL statements
4. Executing those statements to update the database schema

This approach eliminates the need for manual migration files and ensures your database schema always matches your entity definitions.

## Defining Entities

Entities are defined using TypeScript classes with decorators:

```typescript
import 'reflect-metadata';
import { Table, Column, ForeignKey } from 'meridian/sql/decorators';
import { BaseEntity } from 'meridian/sql/base-entity';

@Table({ name: 'users' })
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column({ nullable: true, unique: true })
  email?: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  constructor(data?: Partial<User>) {
    super(data);
    this.username = data?.username || '';
    this.email = data?.email;
    this.displayName = data?.displayName;
  }
}
```

### Entity Decorators

- `@Table({ name: string })`: Marks a class as a database table
- `@Column(options)`: Marks a property as a database column
  - `name`: Custom column name (defaults to snake_case of property name)
  - `primary`: Whether this is a primary key (default: false)
  - `nullable`: Whether this column can be null (default: false)
  - `unique`: Whether this column has a unique constraint (default: false)
  - `type`: SQL type (inferred from TypeScript type if not specified)
  - `default`: SQL default value function
- `@ForeignKey(tableName, columnName)`: Defines a foreign key relationship
- `@VectorColumn(dimensions)`: Defines a vector column for AI embeddings

### Base Entities

Meridian provides base entity classes you can extend:

```typescript
// BaseEntity provides common fields
export abstract class BaseEntity {
  @Column({ primary: true, default: () => "gen_random_uuid()" })
  id: string;

  @Column({ name: "created_at", default: () => "NOW()" })
  createdAt: Date;

  @Column({ name: "updated_at", default: () => "NOW()" })
  updatedAt: Date;

  @Column({ name: "deleted_at", nullable: true })
  deletedAt?: Date;
}

// UserOwnedEntity adds a userId field with foreign key
export abstract class UserOwnedEntity extends BaseEntity {
  @Column({ name: "user_id" })
  @ForeignKey("users", "id")
  userId: string;
}
```

## Entity Directory Structure

By default, Meridian looks for entity classes in the `db/entities` directory. Create this structure:

```
project/
├── db/
│   └── entities/
│       ├── user.ts
│       ├── post.ts
│       └── ...
```

You can export all your entities from an index.ts file:

```typescript
// db/entities/index.ts
export * from './user';
export * from './post';
export * from './comment';
// ...
```

## Running Migrations

### Command Line

You can run migrations directly from the command line:

```bash
# Using npx
npx meridian-migrate

# Or with a script in package.json
# "scripts": {
#   "db:migrate": "meridian-migrate"
# }
npm run db:migrate
```

### Programmatically

You can also run migrations programmatically:

```typescript
import { Pool } from 'pg';
import { runMigration } from 'meridian/sql/run-migration';
import * as entities from './db/entities';

async function migrate() {
  // Create a database pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  // Get all entity classes
  const entityClasses = Object.values(entities).filter(
    entity => typeof entity === 'function'
  );

  // Run migration
  await runMigration(pool, false, entityClasses);
}

migrate().catch(console.error);
```

### Dry Run Mode

You can run migrations in "dry run" mode to see the SQL that would be executed without actually changing the database:

```typescript
// Get the SQL without executing it
const migrationSql = await runMigration(pool, true, entityClasses);
console.log(migrationSql);
```

## Integration with Next.js

### Setup

Create a database utility file:

```typescript
// lib/db.ts
import { Pool } from 'pg';
import { runMigration } from 'meridian/sql/run-migration';
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

### Running Migrations on App Startup

For Next.js 13+ App Router:

```typescript
// app/api/migrate/route.ts
import { NextResponse } from 'next/server';
import { migrateDatabase } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  // Optional: Add authentication to prevent unauthorized migrations
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await migrateDatabase();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}
```

For Next.js Pages Router:

```typescript
// pages/api/migrate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { migrateDatabase } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Optional: Add authentication to prevent unauthorized migrations
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await migrateDatabase();
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Migration failed:', error);
    return res.status(500).json({ 
      error: 'Migration failed', 
      details: error.message 
    });
  }
}
```

### Running Migrations During Development

You can create a custom server script that runs migrations before starting the development server:

```typescript
// scripts/dev.ts
import { spawn } from 'child_process';
import { migrateDatabase } from '../lib/db';

async function dev() {
  try {
    // Run migrations
    console.log('Running database migrations...');
    await migrateDatabase();
    console.log('Migrations completed successfully');

    // Start Next.js dev server
    console.log('Starting Next.js development server...');
    const nextDev = spawn('next', ['dev'], { stdio: 'inherit' });

    // Handle process termination
    process.on('SIGINT', () => {
      nextDev.kill('SIGINT');
    });

    nextDev.on('close', (code) => {
      process.exit(code);
    });
  } catch (error) {
    console.error('Error during startup:', error);
    process.exit(1);
  }
}

dev();
```

Add a script to your package.json:

```json
"scripts": {
  "dev:with-migrate": "ts-node scripts/dev.ts"
}
```

## Advanced Usage

### Custom Entity Loading

You can customize how entities are loaded by providing them directly to the `runMigration` function:

```typescript
import { User } from './entities/user';
import { Post } from './entities/post';
import { Comment } from './entities/comment';

// Run migration with specific entity classes
await runMigration(pool, false, [User, Post, Comment]);
```

### Transaction Control

The migration system uses transactions to ensure all schema changes are applied atomically. If any part of the migration fails, all changes are rolled back.

### Vector Support

Meridian supports PostgreSQL vector columns for AI embeddings:

```typescript
import { BaseEntity } from './base-entity';
import { Table, Column, ForeignKey, VectorColumn } from 'meridian/sql/decorators';

@Table({ name: 'post_embeddings' })
export class PostEmbedding extends BaseEntity {
  @Column({ name: 'post_id' })
  @ForeignKey('posts', 'id')
  postId: string;

  @VectorColumn(1536) // OpenAI embedding dimensions
  embedding: number[];
}
```

The migration system will automatically install the PostgreSQL vector extension if needed.

## Troubleshooting

### Common Issues

1. **Missing reflect-metadata**: Make sure to import 'reflect-metadata' at the top of your entity files and at the entry point of your application.

2. **Decorator Compilation Errors**: Ensure TypeScript is configured to use decorators:

```json
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

3. **Entity Loading Failures**: If entities aren't being loaded automatically, try providing them explicitly to the `runMigration` function.

4. **Database Connection Issues**: Verify your DATABASE_URL environment variable is correctly set and accessible.

### Debugging

To see more detailed logs during migration:

```typescript
// Set environment variable
process.env.DEBUG_MIGRATIONS = 'true';

// Then run migrations
await runMigration(pool, false, entityClasses);
```

## Best Practices

1. **Version Control**: Keep your entity definitions in version control to track schema changes over time.

2. **Test Migrations**: Always test migrations in a development environment before applying them to production.

3. **Backup**: Back up your database before running migrations in production.

4. **Gradual Changes**: Make incremental changes to your schema rather than large, sweeping changes.

5. **Soft Deletes**: Use the `deletedAt` field for soft deletes rather than actually removing data.

6. **Nullable Fields**: When adding new fields to existing tables, make them nullable or provide a default value. 
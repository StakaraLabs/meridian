# Next.js Migration Example

This example demonstrates how to set up and use Meridian's automatic migration system with Next.js.

## Project Structure

```
my-nextjs-app/
├── db/
│   └── entities/
│       ├── index.ts
│       ├── base-entity.ts
│       ├── user-owned-entity.ts
│       ├── user.ts
│       ├── post.ts
│       └── comment.ts
├── lib/
│   ├── db.ts
│   └── auth.ts
├── app/
│   ├── api/
│   │   └── migrate/
│   │       └── route.ts
│   └── ...
└── ...
```

## Entity Definitions

### Base Entities

First, let's define our base entities:

```typescript
// db/entities/base-entity.ts
import 'reflect-metadata';
import { Column } from 'meridian/sql/decorators';

export abstract class BaseEntity {
  @Column({ primary: true, default: () => "gen_random_uuid()" })
  id: string;

  @Column({ name: "created_at", default: () => "NOW()" })
  createdAt: Date;

  @Column({ name: "updated_at", default: () => "NOW()" })
  updatedAt: Date;

  @Column({ name: "deleted_at", nullable: true })
  deletedAt?: Date;
  
  constructor(data?: Partial<BaseEntity>) {
    this.id = data?.id || '';
    this.createdAt = data?.createdAt || new Date();
    this.updatedAt = data?.updatedAt || new Date();
    this.deletedAt = data?.deletedAt;
  }
}

// db/entities/user-owned-entity.ts
import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { Column, ForeignKey } from 'meridian/sql/decorators';

export abstract class UserOwnedEntity extends BaseEntity {
  @Column({ name: "user_id" })
  @ForeignKey("users", "id")
  userId: string;
  
  constructor(data?: Partial<UserOwnedEntity>) {
    super(data);
    this.userId = data?.userId || '';
  }
}
```

### Domain Entities

Now, let's define our domain entities:

```typescript
// db/entities/user.ts
import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { Table, Column } from 'meridian/sql/decorators';

@Table({ name: 'users' })
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column({ nullable: true, unique: true })
  email?: string;

  @Column({ name: 'email_verified', nullable: true })
  emailVerified?: Date;

  @Column({ nullable: true })
  password?: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;
  
  constructor(data?: Partial<User>) {
    super(data);
    this.username = data?.username || '';
    this.email = data?.email;
    this.emailVerified = data?.emailVerified;
    this.password = data?.password;
    this.displayName = data?.displayName;
  }
}

// db/entities/post.ts
import 'reflect-metadata';
import { UserOwnedEntity } from './user-owned-entity';
import { Table, Column } from 'meridian/sql/decorators';

@Table({ name: 'posts' })
export class Post extends UserOwnedEntity {
  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_published', default: () => 'false' })
  isPublished: boolean;

  @Column({ name: 'view_count', default: () => '0' })
  viewCount: number;
  
  constructor(data?: Partial<Post>) {
    super(data);
    this.content = data?.content || '';
    this.isPublished = data?.isPublished ?? false;
    this.viewCount = data?.viewCount ?? 0;
  }
}

// db/entities/comment.ts
import 'reflect-metadata';
import { UserOwnedEntity } from './user-owned-entity';
import { Table, Column, ForeignKey } from 'meridian/sql/decorators';

@Table({ name: 'comments' })
export class Comment extends UserOwnedEntity {
  @Column({ name: 'post_id' })
  @ForeignKey('posts', 'id')
  postId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'parent_id', nullable: true })
  @ForeignKey('comments', 'id')
  parentId?: string;
  
  constructor(data?: Partial<Comment>) {
    super(data);
    this.postId = data?.postId || '';
    this.content = data?.content || '';
    this.parentId = data?.parentId;
  }
}
```

### Export All Entities

Create an index file to export all entities:

```typescript
// db/entities/index.ts
export * from './base-entity';
export * from './user-owned-entity';
export * from './user';
export * from './post';
export * from './comment';
```

## Database Setup

Create a database utility file:

```typescript
// lib/db.ts
import { Pool } from 'pg';
import { runMigration } from 'meridian/sql/run-migration';
import * as entities from '../db/entities';

// Singleton pool instance
let pool: Pool;

/**
 * Get the database pool instance
 */
export function getPool(): Pool {
  if (!pool) {
    // Create the pool if it doesn't exist
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: process.env.NODE_ENV === 'production' ? 20 : 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  
  return pool;
}

/**
 * Run database migrations
 */
export async function migrateDatabase(dryRun: boolean = false): Promise<string> {
  const pool = getPool();
  
  // Get all entity classes (filter out non-class exports)
  const entityClasses = Object.values(entities).filter(
    entity => typeof entity === 'function' && entity.prototype !== undefined
  );
  
  // Run the migration
  return runMigration(pool, dryRun, entityClasses);
}

/**
 * Close the database pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
```

## API Route for Migrations

Create an API route to trigger migrations:

```typescript
// app/api/migrate/route.ts (Next.js App Router)
import { NextResponse } from 'next/server';
import { migrateDatabase } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  // Get the query parameters
  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dryRun') === 'true';
  
  // Check if the user is authorized (admin)
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Run the migration
    const sql = await migrateDatabase(dryRun);
    
    // Return the result
    return NextResponse.json({
      success: true,
      dryRun,
      sql: dryRun ? sql : undefined,
      message: dryRun 
        ? 'Migration SQL generated (dry run)' 
        : 'Migration completed successfully'
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}
```

For Next.js Pages Router:

```typescript
// pages/api/migrate.ts (Next.js Pages Router)
import type { NextApiRequest, NextApiResponse } from 'next';
import { migrateDatabase } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Get the query parameters
  const dryRun = req.query.dryRun === 'true';
  
  // Check if the user is authorized (admin)
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // Run the migration
    const sql = await migrateDatabase(dryRun);
    
    // Return the result
    return res.status(200).json({
      success: true,
      dryRun,
      sql: dryRun ? sql : undefined,
      message: dryRun 
        ? 'Migration SQL generated (dry run)' 
        : 'Migration completed successfully'
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Migration failed', 
      message: error.message 
    });
  }
}
```

## Running Migrations During Development

Create a script to run migrations during development:

```typescript
// scripts/dev.ts
import { spawn } from 'child_process';
import { migrateDatabase, closePool } from '../lib/db';

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
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      nextDev.kill('SIGINT');
      await closePool();
    });

    nextDev.on('close', async (code) => {
      console.log(`Next.js dev server exited with code ${code}`);
      await closePool();
      process.exit(code);
    });
  } catch (error) {
    console.error('Error during startup:', error);
    await closePool();
    process.exit(1);
  }
}

// Run the development script
dev();
```

Add a script to your package.json:

```json
"scripts": {
  "dev": "next dev",
  "dev:migrate": "ts-node scripts/dev.ts",
  "migrate": "ts-node -r dotenv/config scripts/migrate.ts",
  "migrate:dry": "ts-node -r dotenv/config scripts/migrate.ts --dry-run"
}
```

## Running Migrations in Production

For production deployments, you can run migrations during the build process or as part of your deployment pipeline:

```typescript
// scripts/migrate.ts
import { migrateDatabase, closePool } from '../lib/db';

async function migrate() {
  try {
    // Check for dry run flag
    const dryRun = process.argv.includes('--dry-run');
    
    console.log(`Running database migrations${dryRun ? ' (dry run)' : ''}...`);
    const sql = await migrateDatabase(dryRun);
    
    if (dryRun) {
      console.log('Migration SQL:');
      console.log(sql);
      console.log('No changes were made to the database (dry run)');
    } else {
      console.log('Migrations completed successfully');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run the migration script
migrate();
```

## Environment Variables

Make sure to set up the necessary environment variables:

```
# .env.local
DATABASE_URL=postgresql://username:password@localhost:5432/mydatabase
```

## Usage

### Development

During development, you can use:

```bash
# Run migrations and start development server
npm run dev:migrate

# Just run migrations
npm run migrate

# Generate migration SQL without applying changes
npm run migrate:dry
```

### Production

In production, you can run migrations as part of your deployment process:

```bash
# Run migrations before starting the application
npm run migrate && npm start
```

### API Endpoint

You can also trigger migrations via the API endpoint:

```
# Run migrations
GET /api/migrate

# Generate migration SQL without applying changes
GET /api/migrate?dryRun=true
```

## Conclusion

This example demonstrates how to set up and use Meridian's automatic migration system with Next.js. By following this approach, you can:

1. Define your database schema using TypeScript classes with decorators
2. Automatically generate and apply migrations based on your entity definitions
3. Run migrations during development, as part of your deployment process, or via an API endpoint
4. Keep your database schema in sync with your code

This approach eliminates the need for manual migration files and ensures your database schema always matches your entity definitions. 
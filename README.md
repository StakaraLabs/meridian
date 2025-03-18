# Meridian SQL

A lightweight, functional ORM-like library for PostgreSQL. Simple, type-safe database operations without the complexity of full-featured query builders.

## Installation

```bash
npm install meridian-sql
# or
yarn add meridian-sql
```

## Features

- **Functional Approach**: Pure functions and immutable data structures
- **Type Safety**: Full TypeScript support
- **Minimal Dependencies**: Small footprint
- **Connection Pooling**: Efficient database connection management
- **Transaction Support**: Simple transaction handling with automatic rollback
- **Automatic Migrations**: Schema migrations based on entity definitions
- **Named Parameters**: Support for named parameters in raw SQL queries

## Quick Start

```typescript
import 'reflect-metadata';
import { initializePool, getPool } from 'meridian-sql';
import { findBy, listAll, save, deleteBy, query } from 'meridian-sql/operations';
import { withTransaction, withSavepoint } from 'meridian-sql/transaction';
import { Table, Column } from 'meridian-sql/sql/decorators';
import { BaseEntity } from 'meridian-sql/sql/base-entity';

// Initialize the database pool
initializePool({
  connectionString: process.env.DATABASE_URL
});

// Get the pool instance
const pool = getPool();

// Define an entity class
@Table({ name: 'users' })
class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  constructor(data?: Partial<User>) {
    super(data);
    this.username = data?.username || '';
    this.email = data?.email || '';
    this.displayName = data?.displayName;
  }
}

// Run automatic migrations
import { runMigration } from 'meridian-sql/sql/run-migration';
await runMigration(pool, false, [User]);

// Create and save a new user
const newUser = new User({
  username: 'johndoe',
  email: 'john@example.com',
  displayName: 'John Doe'
});
await save(newUser, pool);

// Find a user by ID
const user = await findBy(User, { id: newUser.id }, pool);

// Find all users
const users = await listAll(User, {}, pool);

// Update a user
if (user) {
  user.email = 'new-email@example.com';
  await save(user, pool);
}

// Delete a user
if (user) {
  await deleteBy(User, { id: user.id }, pool);
}

// Raw query with named parameters
const activeUsers = await query(
  'SELECT * FROM users WHERE is_active = :active AND created_at > :date',
  { active: true, date: new Date('2023-01-01') },
  pool
);

// Using transactions
await withTransaction(async (client) => {
  // Operations inside a transaction
  const user = await findBy(User, { username: 'johndoe' }, client);
  
  if (user) {
    // Update user within the transaction
    user.email = 'updated@example.com';
    await save(user, client);
    
    // Create related records in the same transaction
    const profile = new Profile({
      userId: user.id,
      bio: 'A software developer'
    });
    await save(profile, client);
  }
  
  // Transaction automatically commits when the callback completes
  // If an error occurs, it automatically rolls back
});
```

## Entity Definitions

Meridian uses TypeScript decorators to define database entities. Here's how to define an entity class:

```typescript
import 'reflect-metadata';
import { Table, Column, ForeignKey } from 'meridian-sql/sql/decorators';
import { BaseEntity } from 'meridian-sql/sql/base-entity';

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

  constructor(data?: Partial<User>) {
    super(data);
    this.username = data?.username || '';
    this.email = data?.email;
    this.emailVerified = data?.emailVerified;
    this.password = data?.password;
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

- `BaseEntity`: Provides `id`, `createdAt`, `updatedAt`, and `deletedAt` fields
- `UserOwnedEntity`: Extends `BaseEntity` and adds a `userId` field with foreign key

## Raw Queries with Named Parameters

Instead of a full-featured query builder, Meridian provides a simple way to execute raw SQL queries using named parameters:

```typescript
import { query } from 'meridian-sql/operations';

// Use named parameters (prefixed with a colon)
const users = await query(
  'SELECT * FROM users WHERE username = :username OR email = :email',
  { 
    username: 'johndoe', 
    email: 'john@example.com' 
  },
  pool
);

// The same parameter can be reused multiple times
const stats = await query(
  `SELECT 
     COUNT(*) FILTER (WHERE user_id = :userId) AS user_post_count,
     COUNT(*) FILTER (WHERE created_at > :date AND user_id = :userId) AS recent_posts
   FROM posts`,
  {
    userId: '123',
    date: new Date('2023-01-01')
  },
  pool
);
```

The `query` function automatically converts named parameters to PostgreSQL's positional parameters, making your queries cleaner and less error-prone.

## Transaction Support

Meridian provides transaction support to ensure data consistency across multiple operations:

```typescript
import { withTransaction, withSavepoint } from 'meridian-sql/transaction';
import { save, findBy, deleteBy } from 'meridian-sql/operations';

// Basic transaction usage
await withTransaction(async (client) => {
  // All operations use the same client to be part of the transaction
  const user = await findBy(User, { id: 'user123' }, client);
  
  // Update user
  user.isActive = true;
  await save(user, client);
  
  // Create related records
  const post = new Post({ title: 'First Post', userId: user.id });
  await save(post, client);
  
  // Any error will automatically rollback the entire transaction
});

// Nested transactions with savepoints
await withTransaction(async (client) => {
  // Main transaction operations
  const user = await findBy(User, { id: 'user123' }, client);
  
  try {
    // Create a savepoint for operations that might fail
    await withSavepoint('create_post', async () => {
      const post = new Post({
        title: 'New Post',
        userId: user.id
      });
      await save(post, client);
      
      // If this fails, only the savepoint is rolled back
      await someRiskyOperation();
    }, client);
  } catch (error) {
    console.log('Post creation failed, but transaction continues');
  }
  
  // This operation will still be executed even if the savepoint was rolled back
  user.lastSeenAt = new Date();
  await save(user, client);
});
```

## Automatic Migrations

Meridian can automatically generate and run migrations based on your entity definitions:

```typescript
import { Pool } from 'pg';
import { runMigration } from 'meridian-sql/sql/run-migration';
import { User, Post, Comment } from './entities';

// Create a database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Run migration with specific entity classes
await runMigration(pool, false, [User, Post, Comment]);

// Or run in dry-run mode to see the SQL without executing it
const migrationSql = await runMigration(pool, true, [User, Post, Comment]);
console.log(migrationSql);
```

### Running Migrations in Next.js

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

Then call `migrateDatabase()` during app initialization or in an API route.

## Documentation

### API Reference

- [Core API](./docs/api/core.md)
- [Operations](./docs/api/operations.md)
- [Migrations](./docs/api/migrations.md)

### Guides

- [Database Connection Pool](./docs/database-pool.md) - How to initialize and configure the database pool
- [Automatic Migrations](./docs/migrations.md) - How to use automatic schema migrations
- [Transactions](./docs/guides/transactions.md) - How to use transactions for data consistency

### Examples

- [Next.js Database Pool Initialization](./docs/examples/nextjs-pool-initialization.md) - How to use Meridian with Next.js
- [Database Migrations with Pool](./docs/examples/migration-with-pool.md) - How to update migrations to use the pool
- [Next.js Migration Example](./docs/examples/nextjs-migration.md) - Complete example of using Meridian with Next.js

## Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/contributing.md) for details.

## License

MIT © Stakara (Pty) Ltd.
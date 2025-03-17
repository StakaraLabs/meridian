# Meridian

A lightweight, functional ORM-like library for PostgreSQL. Simple, type-safe database operations without the complexity of full-featured query builders.

## Installation

```bash
npm install meridian
# or
yarn add meridian
```

## Features

- **Functional Approach**: Pure functions and immutable data structures
- **Type Safety**: Full TypeScript support
- **Minimal Dependencies**: Small footprint
- **Connection Pooling**: Efficient database connection management
- **Transaction Support**: Simple transaction handling with automatic rollback
- **Automatic Migrations**: Schema migrations based on entity definitions

## Quick Start

```typescript
import { initializePool, getPool } from 'meridian';
import { findAll, insert, update, remove } from 'meridian/operations';

// Initialize the database pool
initializePool({
  connectionString: process.env.DATABASE_URL
});

// Get the pool instance
const pool = getPool();

// Define a type for your data
interface User {
  id?: number;
  name: string;
  email: string;
  created_at?: Date;
}

// Fetch all users
const users = await findAll<User>(pool, 'users');

// Insert a new user
const newUser = await insert<User>(pool, 'users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// Update a user
const updatedUser = await update<User>(pool, 'users', 
  { email: 'new-email@example.com' },
  { id: newUser.id }
);

// Delete a user
await remove(pool, 'users', { id: newUser.id });

// Execute a raw query
const result = await pool.query(`
  SELECT * FROM users 
  WHERE created_at > $1
`, [new Date('2023-01-01')]);
```

## Documentation

For full documentation, visit [our documentation site](https://meridian-docs.example.com).

### API Reference

- [Core API](https://meridian-docs.example.com/api/core)
- [Operations](https://meridian-docs.example.com/api/operations)
- [Migrations](https://meridian-docs.example.com/api/migrations)

### Guides

- [Database Connection Pool](./docs/database-pool.md) - How to initialize and configure the database pool
- [Automatic Migrations](./docs/migrations.md) - How to use automatic schema migrations
- [Transactions](https://meridian-docs.example.com/guides/transactions)

## Examples

- [Next.js Database Pool Initialization](./docs/examples/nextjs-pool-initialization.md) - How to use Meridian with Next.js
- [Database Migrations with Pool](./docs/examples/migration-with-pool.md) - How to update migrations to use the pool
- More examples in our [examples directory](./examples)

## Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/contributing.md) for details.

## License

MIT © [Your Name] 
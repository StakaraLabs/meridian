# Meridian Library Specification

## Overview
Meridian is a lightweight, functional ORM-like library for PostgreSQL. It provides a simple, type-safe interface for database operations without the complexity of full-featured query builders. This library aims to be lightweight, modular, and easy to integrate into existing Node.js projects.

## Installation

```bash
npm install meridian
# or
yarn add meridian
```

## Core Features

### 1. Database Connection Management
- **Connection Pooling**: Efficient connection management
- **Transaction Support**: Simple transaction handling with automatic rollback on errors
- **Configuration**: Easy setup with sensible defaults

### 2. Data Operations
- **CRUD Operations**: Simple functions for common database operations
- **Batch Operations**: Efficient bulk inserts, updates, and deletes
- **Raw Query Support**: Execute custom SQL when needed

### 3. Utilities
- **Migration Tools**: Simple schema migration utilities
- **Type Mapping**: Automatic mapping between PostgreSQL and TypeScript types
- **Query Logging**: Optional logging for debugging and performance monitoring

## Design Principles

1. **Functional Approach**: Prefer pure functions and immutable data structures
2. **Composability**: Small, focused functions that can be combined
3. **Type Safety**: Full TypeScript support with strong typing
4. **Minimal Dependencies**: Only essential dependencies to keep bundle size small
5. **Performance**: Optimized for common database operations

## API Design

### Module Structure
```
meridian/
  ├── core/         # Core database functionality
  │   ├── connection.ts  # Connection management
  │   ├── transaction.ts # Transaction handling
  │   └── query.ts       # Query execution
  ├── operations/   # CRUD and batch operations
  │   ├── select.ts      # Read operations
  │   ├── insert.ts      # Create operations
  │   ├── update.ts      # Update operations
  │   └── delete.ts      # Delete operations
  ├── migrations/   # Schema migration utilities
  ├── utils/        # Helper utilities
  └── types/        # TypeScript type definitions
```

### Import Pattern
```javascript
// Import specific functions
import { connect, query } from 'meridian/core';
import { findById, findAll } from 'meridian/operations';

// Import everything from a module
import * as MeridianCore from 'meridian/core';
```

### Usage Example
```typescript
import { connect } from 'meridian/core';
import { findAll, insert, update, remove } from 'meridian/operations';

// Connect to database
const db = connect({
  host: 'localhost',
  database: 'my_db',
  user: 'postgres',
  password: 'password'
});

// Define a type for your data
interface User {
  id?: number;
  name: string;
  email: string;
  created_at?: Date;
}

// Fetch all users
const users = await findAll<User>(db, 'users');

// Insert a new user
const newUser = await insert<User>(db, 'users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// Update a user
const updatedUser = await update<User>(db, 'users', 
  { email: 'new-email@example.com' },
  { id: newUser.id }
);

// Delete a user
await remove(db, 'users', { id: newUser.id });
```

## Development Guidelines

### Code Style
- Functional programming paradigms where appropriate
- Small, composable functions with single responsibilities
- Comprehensive unit tests for all functions
- Detailed JSDoc comments for all public APIs

### Testing Strategy
- Unit tests for all utility functions
- Integration tests with actual PostgreSQL database
- Performance benchmarks for critical operations

### Documentation
- Comprehensive API documentation
- Usage examples for all operations
- Migration guides and best practices

## Roadmap

### v1.0.0 (Initial Release)
- Core database connection management
- Basic CRUD operations
- Transaction support
- TypeScript definitions

### Future Versions
- Advanced filtering options
- Relation handling (joins)
- Schema introspection
- Additional database adapters (MySQL, SQLite)

## Contribution Guidelines
Contributors should refer to the [Contributing Guide](./docs/contributing.md) for detailed information on:
- Code style and standards
- Pull request process
- Testing requirements
- Documentation requirements

## License
MIT License

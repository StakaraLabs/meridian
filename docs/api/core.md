# Core API

This document provides detailed information about the core API functions in Meridian.

## Database Connection

### `initializePool(options?: PoolConfig): Pool`

Initializes the database connection pool with the given configuration options.

**Parameters:**
- `options` (optional): Configuration options for the pool
  - `connectionString`: PostgreSQL connection string
  - `max`: Maximum number of clients in the pool (default: 10)
  - `idleTimeoutMillis`: How long a client is allowed to remain idle before being closed (default: 30000)
  - `connectionTimeoutMillis`: How long to wait for a connection (default: 0, no timeout)
  - `ssl`: SSL configuration options

**Returns:**
- The initialized Pool instance

**Example:**
```typescript
import { initializePool } from 'meridian-sql';

const pool = initializePool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000
});
```

### `getPool(): Pool`

Gets the current database pool instance. The pool must be initialized with `initializePool()` before calling this function.

**Returns:**
- The current Pool instance

**Example:**
```typescript
import { getPool } from 'meridian-sql';

const pool = getPool();
```

### `closePool(): Promise<void>`

Closes the database pool and all connections.

**Returns:**
- A Promise that resolves when the pool is closed

**Example:**
```typescript
import { closePool } from 'meridian-sql';

// Close the pool when shutting down
process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});
```

## Entity Reflection

### `getTableMetadata(entityClass: Function): TableMetadata`

Gets the table metadata for an entity class.

**Parameters:**
- `entityClass`: The entity class to get metadata for

**Returns:**
- Table metadata including name, columns, and constraints

**Example:**
```typescript
import { getTableMetadata } from 'meridian-sql/sql/metadata';
import { User } from './entities/user';

const metadata = getTableMetadata(User);
console.log(metadata.name); // 'users'
```

### `getColumnMetadata(entityClass: Function, propertyKey: string): ColumnMetadata`

Gets the column metadata for a specific property of an entity class.

**Parameters:**
- `entityClass`: The entity class to get metadata for
- `propertyKey`: The property name to get metadata for

**Returns:**
- Column metadata including name, type, and constraints

**Example:**
```typescript
import { getColumnMetadata } from 'meridian-sql/sql/metadata';
import { User } from './entities/user';

const metadata = getColumnMetadata(User, 'email');
console.log(metadata.name); // 'email'
console.log(metadata.unique); // true
```

## Utility Functions

### `snakeCase(str: string): string`

Converts a camelCase string to snake_case.

**Parameters:**
- `str`: The string to convert

**Returns:**
- The converted snake_case string

**Example:**
```typescript
import { snakeCase } from 'meridian-sql/utils';

console.log(snakeCase('userName')); // 'user_name'
```

### `camelCase(str: string): string`

Converts a snake_case string to camelCase.

**Parameters:**
- `str`: The string to convert

**Returns:**
- The converted camelCase string

**Example:**
```typescript
import { camelCase } from 'meridian-sql/utils';

console.log(camelCase('user_name')); // 'userName'
``` 
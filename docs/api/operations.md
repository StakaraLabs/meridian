# Operations API

This document provides detailed information about the database operations API in Meridian.

## Basic Operations

### `findById<T>(pool: Pool, entityClass: new () => T, id: string | number): Promise<T | null>`

Finds an entity by its ID.

**Parameters:**
- `pool`: Database connection pool
- `entityClass`: Entity class to query
- `id`: ID of the entity to find

**Returns:**
- Promise resolving to the entity or null if not found

**Example:**
```typescript
import { findById } from 'meridian-sql/operations';
import { User } from './entities/user';

const user = await findById(pool, User, '123');
```

### `findAll<T>(pool: Pool, entityClass: new () => T, options?: FindOptions): Promise<T[]>`

Finds all entities of a given type.

**Parameters:**
- `pool`: Database connection pool
- `entityClass`: Entity class to query
- `options` (optional): Query options
  - `where`: WHERE conditions
  - `orderBy`: ORDER BY clause
  - `limit`: Maximum number of results
  - `offset`: Number of results to skip

**Returns:**
- Promise resolving to an array of entities

**Example:**
```typescript
import { findAll } from 'meridian-sql/operations';
import { User } from './entities/user';

const users = await findAll(pool, User, {
  where: { isActive: true },
  orderBy: { createdAt: 'DESC' },
  limit: 10
});
```

### `findOne<T>(pool: Pool, entityClass: new () => T, where: Partial<T>): Promise<T | null>`

Finds a single entity matching the given criteria.

**Parameters:**
- `pool`: Database connection pool
- `entityClass`: Entity class to query
- `where`: WHERE conditions

**Returns:**
- Promise resolving to the entity or null if not found

**Example:**
```typescript
import { findOne } from 'meridian-sql/operations';
import { User } from './entities/user';

const user = await findOne(pool, User, { email: 'user@example.com' });
```

### `save<T extends BaseEntity>(pool: Pool, entity: T): Promise<T>`

Saves an entity to the database (insert or update).

**Parameters:**
- `pool`: Database connection pool
- `entity`: Entity to save

**Returns:**
- Promise resolving to the saved entity

**Example:**
```typescript
import { save } from 'meridian-sql/operations';
import { User } from './entities/user';

const user = new User({
  username: 'johndoe',
  email: 'john@example.com'
});

const savedUser = await save(pool, user);
```

### `remove<T extends BaseEntity>(pool: Pool, entity: T): Promise<boolean>`

Removes an entity from the database.

**Parameters:**
- `pool`: Database connection pool
- `entity`: Entity to remove

**Returns:**
- Promise resolving to true if the entity was removed

**Example:**
```typescript
import { remove } from 'meridian-sql/operations';

const success = await remove(pool, user);
```

## Transaction Operations

### `beginTransaction(pool: Pool): Promise<PoolClient>`

Begins a new transaction.

**Parameters:**
- `pool`: Database connection pool

**Returns:**
- Promise resolving to a client with an active transaction

**Example:**
```typescript
import { beginTransaction } from 'meridian-sql/operations';

const client = await beginTransaction(pool);
try {
  // Perform operations with client
  await client.query('INSERT INTO users (name) VALUES ($1)', ['John']);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### `withTransaction<T>(pool: Pool, callback: (client: PoolClient) => Promise<T>): Promise<T>`

Executes a callback within a transaction.

**Parameters:**
- `pool`: Database connection pool
- `callback`: Function to execute within the transaction

**Returns:**
- Promise resolving to the result of the callback

**Example:**
```typescript
import { withTransaction } from 'meridian-sql/operations';

const result = await withTransaction(pool, async (client) => {
  const { rows: [user] } = await client.query(
    'INSERT INTO users (name) VALUES ($1) RETURNING *',
    ['John']
  );
  
  await client.query(
    'INSERT INTO profiles (user_id, bio) VALUES ($1, $2)',
    [user.id, 'A new user']
  );
  
  return user;
});
```

## Batch Operations

### `saveMany<T extends BaseEntity>(pool: Pool, entities: T[]): Promise<T[]>`

Saves multiple entities in a single transaction.

**Parameters:**
- `pool`: Database connection pool
- `entities`: Array of entities to save

**Returns:**
- Promise resolving to the array of saved entities

**Example:**
```typescript
import { saveMany } from 'meridian-sql/operations';
import { User } from './entities/user';

const users = [
  new User({ username: 'user1', email: 'user1@example.com' }),
  new User({ username: 'user2', email: 'user2@example.com' })
];

const savedUsers = await saveMany(pool, users);
```

### `removeMany<T extends BaseEntity>(pool: Pool, entities: T[]): Promise<boolean>`

Removes multiple entities in a single transaction.

**Parameters:**
- `pool`: Database connection pool
- `entities`: Array of entities to remove

**Returns:**
- Promise resolving to true if all entities were removed

**Example:**
```typescript
import { removeMany } from 'meridian-sql/operations';

const success = await removeMany(pool, [user1, user2, user3]);
```

## Query Building

### `buildSelectQuery<T>(entityClass: new () => T, options?: FindOptions): { text: string, values: any[] }`

Builds a SELECT query for an entity class.

**Parameters:**
- `entityClass`: Entity class to query
- `options` (optional): Query options

**Returns:**
- Object with query text and parameter values

**Example:**
```typescript
import { buildSelectQuery } from 'meridian-sql/operations';
import { User } from './entities/user';

const query = buildSelectQuery(User, {
  where: { isActive: true },
  orderBy: { createdAt: 'DESC' },
  limit: 10
});

const { rows } = await pool.query(query.text, query.values);
```

### `buildInsertQuery<T>(entity: T): { text: string, values: any[] }`

Builds an INSERT query for an entity.

**Parameters:**
- `entity`: Entity to insert

**Returns:**
- Object with query text and parameter values

**Example:**
```typescript
import { buildInsertQuery } from 'meridian-sql/operations';
import { User } from './entities/user';

const user = new User({ username: 'johndoe', email: 'john@example.com' });
const query = buildInsertQuery(user);

const { rows } = await pool.query(query.text, query.values);
```

### `buildUpdateQuery<T>(entity: T): { text: string, values: any[] }`

Builds an UPDATE query for an entity.

**Parameters:**
- `entity`: Entity to update

**Returns:**
- Object with query text and parameter values

**Example:**
```typescript
import { buildUpdateQuery } from 'meridian-sql/operations';

user.email = 'newemail@example.com';
const query = buildUpdateQuery(user);

const { rows } = await pool.query(query.text, query.values);
``` 
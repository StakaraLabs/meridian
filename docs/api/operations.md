# Operations API

This document provides detailed information about the database operations API in Meridian.

## Entity Operations

### `findBy<T>(entityClass: new () => T, criteria: Partial<T>, client?: PoolClient | Pool): Promise<T | null>`

Finds a single entity matching the given criteria.

**Parameters:**
- `entityClass`: Entity class to query
- `criteria`: Object with properties to match against
- `client`: Optional database client (defaults to global pool)

**Returns:**
- Promise resolving to the entity or null if not found

**Example:**
```typescript
import { findBy } from 'meridian-sql/operations';
import { User } from './entities/user';

const user = await findBy(User, { email: 'user@example.com' });
```

### `listAll<T>(entityClass: new () => T, criteria?: Partial<T>, client?: PoolClient | Pool): Promise<T[]>`

Lists all entities matching the given criteria.

**Parameters:**
- `entityClass`: Entity class to query
- `criteria`: Object with properties to match against (optional)
- `client`: Optional database client (defaults to global pool)

**Returns:**
- Promise resolving to an array of entities

**Example:**
```typescript
import { listAll } from 'meridian-sql/operations';
import { User } from './entities/user';

// Get all active users
const users = await listAll(User, { isActive: true });

// Get all users
const allUsers = await listAll(User);
```

### `save<T extends EntityBase>(entity: T, client?: PoolClient | Pool): Promise<T>`

Saves an entity to the database (insert or update).

**Parameters:**
- `entity`: Entity to save
- `client`: Optional database client (defaults to global pool)

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

const savedUser = await save(user);
```

### `deleteBy<T>(entityClass: new () => T, criteria: Partial<T>, client?: PoolClient | Pool): Promise<number>`

Deletes entities matching the given criteria.

**Parameters:**
- `entityClass`: Entity class to delete from
- `criteria`: Object with properties to match against
- `client`: Optional database client (defaults to global pool)

**Returns:**
- Promise resolving to the number of deleted entities

**Example:**
```typescript
import { deleteBy } from 'meridian-sql/operations';
import { User } from './entities/user';

// Delete inactive users
const deletedCount = await deleteBy(User, { isActive: false });
```

## Raw Queries with Named Parameters

### `query<T = any>(sql: string, params: Record<string, any> = {}, client: PoolClient | Pool = pool): Promise<T[]>`

Executes a raw SQL query with named parameters.

**Parameters:**
- `sql`: SQL query string with named parameters (e.g., `:paramName`)
- `params`: Object containing named parameter values
- `client`: Optional database client for transaction support (defaults to the global pool)

**Returns:**
- Promise resolving to the query result rows

**Details:**
- Named parameters in the SQL string should be prefixed with a colon (`:`)
- The function automatically converts named parameters to PostgreSQL's positional parameters
- The same named parameter can be used multiple times in the query and will be properly mapped

**Example:**
```typescript
import { query } from 'meridian-sql/operations';

// Query with named parameters
const users = await query(
  `SELECT * FROM users WHERE username = :username OR email = :email`,
  { 
    username: 'johndoe', 
    email: 'john@example.com' 
  }
);

// Using the same parameter multiple times
const count = await query(
  `SELECT COUNT(*) FROM posts 
   WHERE user_id = :userId 
   AND created_at > :date 
   AND (title LIKE '%' || :searchTerm || '%' OR content LIKE '%' || :searchTerm || '%')`,
  {
    userId: '123',
    date: new Date('2023-01-01'),
    searchTerm: 'important'
  }
);
```

## Utility Functions

### `mapRowToEntity<T extends EntityBase>(row: any, entityClass: new () => T): Partial<T>`

Maps a database row to an entity.

**Parameters:**
- `row`: Database row data
- `entityClass`: Entity class to map to

**Returns:**
- Partial entity with properties populated from the row

**Example:**
```typescript
import { mapRowToEntity } from 'meridian-sql/operations';
import { User } from './entities/user';

const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
if (rows.length > 0) {
  const userData = mapRowToEntity(rows[0], User);
  const user = new User(userData);
  return user;
}
return null;
```

## Transaction Support

### `withTransaction<T>(callback: (client: PoolClient) => Promise<T>, existingClient?: PoolClient): Promise<T>`

Executes a callback within a transaction. Automatically handles transaction begin/commit/rollback and client release.

**Parameters:**
- `callback`: Function to execute within the transaction
- `existingClient`: Optional existing client to use (for nested transactions)

**Returns:**
- Promise resolving to the result of the callback

**Example:**
```typescript
import { withTransaction } from 'meridian-sql/transaction';
import { save, findBy } from 'meridian-sql/operations';

const result = await withTransaction(async (client) => {
  // Find user
  const user = await findBy(User, { id: 'user-123' }, client);
  
  // Create new post
  const post = new Post({ 
    title: 'New Post',
    userId: user.id
  });
  await save(post, client);
  
  // Create comment
  const comment = new Comment({
    content: 'First comment!',
    postId: post.id,
    userId: user.id
  });
  await save(comment, client);
  
  return { post, comment };
});
```

### `withSavepoint<T>(name: string, callback: () => Promise<T>, client: PoolClient): Promise<T>`

Executes a callback within a savepoint in a transaction. Useful for partial rollbacks.

**Parameters:**
- `name`: Savepoint name
- `callback`: Function to execute within the savepoint
- `client`: Transaction client

**Returns:**
- Promise resolving to the result of the callback

**Example:**
```typescript
import { withTransaction } from 'meridian-sql/transaction';
import { withSavepoint } from 'meridian-sql/transaction';
import { save } from 'meridian-sql/operations';

await withTransaction(async (client) => {
  // Main transaction operations
  const user = await findBy(User, { id: 'user-123' }, client);
  
  // Create post in a savepoint
  try {
    await withSavepoint('create_post', async () => {
      const post = new Post({
        title: 'New Post',
        userId: user.id
      });
      await save(post, client);
    }, client);
  } catch (error) {
    console.error('Post creation failed, but transaction continues');
  }
  
  // Continue with other operations
});
``` 
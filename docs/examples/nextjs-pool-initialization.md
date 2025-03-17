# Next.js Database Pool Initialization Example

This example demonstrates how to properly initialize and use the Meridian database pool in a Next.js application.

## Setup

### 1. Create a Database Utility File

First, create a utility file to initialize and export the database pool:

```typescript
// lib/db.ts
import { initializePool, getPool } from 'meridian';

// Initialize the pool with default configuration
// This will use the DATABASE_URL environment variable
if (!global.poolInitialized) {
  initializePool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === 'production' ? 20 : 5,
    idleTimeoutMillis: 30000
  });
  global.poolInitialized = true;
}

export { getPool };
```

### 2. Set Up Environment Variables

Create a `.env.local` file in your project root:

```
DATABASE_URL=postgresql://username:password@localhost:5432/your_database
```

Make sure to add this file to your `.gitignore`.

### 3. Using the Pool in API Routes

```typescript
// app/api/users/route.ts
import { getPool } from '@/lib/db';
import { findAll } from 'meridian/operations';

export async function GET() {
  try {
    const pool = getPool();
    const users = await findAll(pool, 'users');
    return Response.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
```

### 4. Using the Pool in Server Components

```typescript
// app/users/page.tsx
import { getPool } from '@/lib/db';
import { findAll } from 'meridian/operations';

interface User {
  id: string;
  name: string;
  email: string;
}

export default async function UsersPage() {
  const pool = getPool();
  const users = await findAll<User>(pool, 'users');
  
  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name} ({user.email})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Handling Transactions

Here's an example of using transactions with the pool:

```typescript
// app/api/transfer/route.ts
import { getPool } from '@/lib/db';
import { beginTransaction } from 'meridian/operations';

export async function POST(request: Request) {
  const { fromAccountId, toAccountId, amount } = await request.json();
  
  const pool = getPool();
  
  // Begin a transaction
  const client = await beginTransaction(pool);
  
  try {
    // Deduct from source account
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromAccountId]
    );
    
    // Add to destination account
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toAccountId]
    );
    
    // Commit the transaction
    await client.query('COMMIT');
    
    return Response.json({ success: true });
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Transaction failed:', error);
    return Response.json(
      { error: 'Transaction failed' },
      { status: 500 }
    );
  } finally {
    // Release the client back to the pool
    client.release();
  }
}
```

## Best Practices for Next.js Applications

1. **Initialize Once**: Initialize the pool only once per server instance.
2. **Environment-Specific Configuration**: Use different pool configurations for development and production.
3. **Error Handling**: Always handle database errors gracefully.
4. **Connection Management**: Release connections back to the pool after use, especially in transactions.
5. **Serverless Considerations**: For serverless deployments (Vercel), be mindful of connection limits and idle timeouts.

## Troubleshooting

### Common Issues in Next.js

1. **Multiple Pool Initializations**: If you're seeing too many connections, ensure the pool is only initialized once.
2. **Connection Timeouts in Development**: Hot reloading can cause multiple pool initializations. Use the global variable pattern shown above.
3. **Vercel Deployment Issues**: For Vercel deployments, consider using connection pooling services like PgBouncer or using a hosted PostgreSQL service with connection pooling. 
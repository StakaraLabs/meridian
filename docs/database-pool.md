# Database Connection Pool

Meridian uses connection pooling to efficiently manage database connections. This guide explains how to initialize the connection pool and provides best practices for optimal performance.

## Initializing the Database Pool

The database pool must be initialized before using any database operations. Here's how to initialize it in different environments:

### Next.js Application

In a Next.js application, you should initialize the pool during server startup. The best place to do this is in a file that runs when your application starts.

#### Option 1: Using a Singleton Pattern

Create a file like `lib/db.ts`:

```typescript
import { initializePool, getPool } from 'meridian';

// Initialize the pool with default configuration
// This will use the DATABASE_URL environment variable
initializePool();

// Export the getPool function for use in your application
export { getPool };
```

Then import and use it in your API routes or server components:

```typescript
import { getPool } from '@/lib/db';
import { findAll } from 'meridian/operations';

export async function GET() {
  const pool = getPool();
  const users = await findAll(pool, 'users');
  return Response.json({ users });
}
```

#### Option 2: Using Next.js App Initialization

For Next.js 13+ with App Router, you can initialize the pool in a global initialization file:

```typescript
// app/api/_init.ts
import { initializePool } from 'meridian';

// Initialize the pool
initializePool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000 // how long a client is allowed to remain idle before being closed
});

export const runtime = 'nodejs';
```

Then import this file in your layout or page:

```typescript
// app/layout.tsx
import './_init'; // This ensures the pool is initialized

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

### Custom Configuration

You can customize the pool configuration by passing options to the `initializePool` function:

```typescript
import { initializePool } from 'meridian';

initializePool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait for a connection
  ssl: {
    rejectUnauthorized: false // needed for some hosted PostgreSQL providers
  }
});
```

## Best Practices for PostgreSQL Connection Pooling

### 1. Pool Size Configuration

- **Default Pool Size**: The default pool size is typically 10 connections. This is suitable for small to medium applications.
- **Calculating Optimal Size**: A good rule of thumb is `connections = (core_count * 2) + effective_spindle_count`.
- **Max Connections**: Be aware of your PostgreSQL server's `max_connections` setting (typically 100-200 by default).

### 2. Connection Lifetime Management

- **Idle Timeout**: Set `idleTimeoutMillis` to close idle connections (30-60 seconds is reasonable).
- **Connection Timeout**: Use `connectionTimeoutMillis` to limit how long to wait for a connection (2-5 seconds).
- **Avoid Leaking Connections**: Always release connections back to the pool after use.

### 3. Error Handling

- **Connection Errors**: Handle connection errors gracefully with retries and backoff strategies.
- **Pool Events**: Listen for pool events like 'error' to detect and handle issues.

```typescript
import { initializePool } from 'meridian';

const pool = initializePool();

// Listen for pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1); // In production, you might want more graceful handling
});
```

### 4. Environment-Specific Settings

- **Development**: Smaller pool size (3-5) is usually sufficient.
- **Production**: Larger pool size based on load and server capacity.
- **Testing**: Minimal pool size (2-3) to reduce resource usage.

### 5. Monitoring and Debugging

- **Pool Statistics**: Periodically log pool statistics to monitor usage.

```typescript
import { getPool } from 'meridian';

// Log pool statistics every 5 minutes
setInterval(() => {
  const pool = getPool();
  console.log('Pool stats:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
}, 5 * 60 * 1000);
```

### 6. Serverless Environments

- **Connection Reuse**: In serverless environments (like AWS Lambda), initialize the pool outside the handler function to reuse connections across invocations.
- **Smaller Pool Size**: Use smaller pool sizes (3-5) in serverless environments.
- **Shorter Timeouts**: Use shorter timeouts to avoid hanging connections.

## Troubleshooting

### Common Issues

1. **Too many connections**: If you see errors about too many connections, reduce your pool size or increase the PostgreSQL `max_connections` setting.
2. **Connection timeouts**: If connections time out frequently, check network latency and consider increasing `connectionTimeoutMillis`.
3. **Idle connections being closed**: If you see errors about connections being closed by the server, adjust your `idleTimeoutMillis` to be shorter than the server's timeout.

### Debugging Connection Issues

Enable detailed logging to debug connection issues:

```typescript
import { initializePool } from 'meridian';

initializePool({
  connectionString: process.env.DATABASE_URL,
  // Enable query logging
  log: (msg) => console.log(msg)
});
``` 
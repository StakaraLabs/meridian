# Transactions in Meridian

This guide explains how to use transactions in Meridian to ensure data consistency and integrity.

## Understanding Transactions

Transactions are a way to group multiple database operations into a single unit of work. Either all operations succeed, or none of them do. This ensures that your database remains in a consistent state, even if errors occur.

Key properties of transactions:

- **Atomicity**: All operations succeed or all fail
- **Consistency**: The database moves from one valid state to another
- **Isolation**: Transactions are isolated from each other
- **Durability**: Once committed, changes are permanent

## Basic Transaction Usage

Meridian provides two main ways to work with transactions:

1. Using the `beginTransaction` function
2. Using the `withTransaction` helper

### Using `beginTransaction`

The `beginTransaction` function gives you direct control over the transaction lifecycle:

```typescript
import { getPool } from 'meridian-sql';
import { beginTransaction } from 'meridian-sql/operations';

async function transferFunds(fromAccountId: string, toAccountId: string, amount: number) {
  const pool = getPool();
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
    
    return true;
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Transaction failed:', error);
    throw error;
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}
```

### Using `withTransaction`

The `withTransaction` helper manages the transaction lifecycle for you, including committing, rolling back, and releasing the client:

```typescript
import { getPool } from 'meridian-sql';
import { withTransaction } from 'meridian-sql/operations';

async function transferFunds(fromAccountId: string, toAccountId: string, amount: number) {
  const pool = getPool();
  
  return await withTransaction(pool, async (client) => {
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
    
    return true;
  });
}
```

## Transactions with Entity Operations

You can use transactions with Meridian's entity operations by passing the transaction client instead of the pool:

```typescript
import { getPool } from 'meridian-sql';
import { beginTransaction, findById, save } from 'meridian-sql/operations';
import { User, Account } from './entities';

async function createUserWithAccount(userData: Partial<User>, accountData: Partial<Account>) {
  const pool = getPool();
  const client = await beginTransaction(pool);
  
  try {
    // Create user
    const user = new User(userData);
    await save(client, user);
    
    // Create account with user ID
    const account = new Account({
      ...accountData,
      userId: user.id
    });
    await save(client, account);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    return { user, account };
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Release the client
    client.release();
  }
}
```

## Nested Transactions

PostgreSQL doesn't support true nested transactions, but you can use savepoints to achieve similar functionality:

```typescript
import { getPool } from 'meridian-sql';
import { beginTransaction } from 'meridian-sql/operations';

async function complexOperation() {
  const pool = getPool();
  const client = await beginTransaction(pool);
  
  try {
    // First part of the transaction
    await client.query('INSERT INTO logs (message) VALUES ($1)', ['Starting operation']);
    
    // Create a savepoint
    await client.query('SAVEPOINT part_one');
    
    try {
      // Second part that might fail
      await client.query('UPDATE inventory SET stock = stock - 1 WHERE id = $1', [123]);
    } catch (error) {
      // Roll back to the savepoint, not the entire transaction
      await client.query('ROLLBACK TO SAVEPOINT part_one');
      console.error('Part two failed, rolling back to savepoint:', error);
    }
    
    // Continue with the rest of the transaction
    await client.query('INSERT INTO logs (message) VALUES ($1)', ['Finishing operation']);
    
    // Commit the transaction
    await client.query('COMMIT');
  } catch (error) {
    // Rollback the entire transaction
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Release the client
    client.release();
  }
}
```

## Transaction Isolation Levels

PostgreSQL supports different transaction isolation levels. You can set the isolation level for a transaction:

```typescript
import { getPool } from 'meridian-sql';
import { beginTransaction } from 'meridian-sql/operations';

async function readConsistentData() {
  const pool = getPool();
  const client = await beginTransaction(pool);
  
  try {
    // Set isolation level to serializable
    await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    
    // Perform queries that need consistent reads
    const { rows: accounts } = await client.query('SELECT * FROM accounts');
    const { rows: transactions } = await client.query('SELECT * FROM transactions');
    
    // Commit the transaction
    await client.query('COMMIT');
    
    return { accounts, transactions };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## Best Practices

1. **Keep Transactions Short**: Long-running transactions can lead to lock contention.
2. **Handle Errors Properly**: Always include error handling and rollback logic.
3. **Always Release Clients**: Use try/finally blocks to ensure clients are released.
4. **Use `withTransaction` for Simplicity**: For most cases, the `withTransaction` helper is cleaner and safer.
5. **Be Mindful of Isolation Levels**: Choose the appropriate isolation level for your use case.
6. **Avoid Excessive Transactions**: Don't wrap every single operation in a transaction.

## Common Pitfalls

1. **Forgetting to Release Clients**: This can lead to connection pool exhaustion.
2. **Not Handling Errors**: Failing to catch errors and roll back can leave your database in an inconsistent state.
3. **Transaction Timeouts**: Long-running transactions may time out.
4. **Deadlocks**: Concurrent transactions can deadlock if they lock resources in different orders.
5. **Connection Leaks**: Always release the client, even if an error occurs. 
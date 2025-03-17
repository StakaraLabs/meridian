import { Pool, PoolClient } from 'pg';
import { pool } from './types';

/**
 * Execute a function within a database transaction
 *
 * @param callback Function to execute within the transaction
 * @param existingClient Optional existing client to use (for nested transactions)
 * @returns Result of the callback function
 *
 * @example
 * ```typescript
 * const result = await withTransaction(async (client) => {
 *   // Perform multiple database operations
 *   const user = await findBy(User, { id: 'user-123' }, client);
 *   const entry = new Entry();
 *   entry.userId = user.id;
 *   entry.title = 'Transaction Test';
 *   await save(entry, client);
 *
 *   // Return a result if needed
 *   return entry;
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  existingClient?: PoolClient
): Promise<T> {
  // If an existing client is provided, use it (for nested transactions)
  const shouldReleaseClient = !existingClient;
  const client = existingClient || await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Execute the callback with the transaction client
    const result = await callback(client);

    // Commit the transaction
    await client.query('COMMIT');

    return result;
  } catch (error) {
    // Rollback the transaction on error
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Release the client if we acquired it
    if (shouldReleaseClient) {
      client.release();
    }
  }
}

/**
 * Execute a function within a savepoint in a transaction
 * Useful for partial rollbacks within a larger transaction
 *
 * @param name Savepoint name
 * @param callback Function to execute within the savepoint
 * @param client Transaction client
 * @returns Result of the callback function
 *
 * @example
 * ```typescript
 * await withTransaction(async (client) => {
 *   // Main transaction operations
 *   const user = await findBy(User, { id: 'user-123' }, client);
 *
 *   // Operations in a savepoint
 *   try {
 *     await withSavepoint('create_entry', async () => {
 *       const entry = new Entry();
 *       entry.userId = user.id;
 *       entry.title = 'Savepoint Test';
 *       await save(entry, client);
 *     }, client);
 *   } catch (error) {
 *     console.error('Entry creation failed, but transaction continues');
 *   }
 *
 *   // Continue with other operations
 * });
 * ```
 */
export async function withSavepoint<T>(
  name: string,
  callback: () => Promise<T>,
  client: PoolClient
): Promise<T> {
  try {
    // Create a savepoint
    await client.query(`SAVEPOINT ${name}`);

    // Execute the callback
    const result = await callback();

    // Release the savepoint
    await client.query(`RELEASE SAVEPOINT ${name}`);

    return result;
  } catch (error) {
    // Rollback to the savepoint on error
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    throw error;
  }
}

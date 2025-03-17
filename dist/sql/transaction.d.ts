import { PoolClient } from 'pg';
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
export declare function withTransaction<T>(callback: (client: PoolClient) => Promise<T>, existingClient?: PoolClient): Promise<T>;
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
export declare function withSavepoint<T>(name: string, callback: () => Promise<T>, client: PoolClient): Promise<T>;

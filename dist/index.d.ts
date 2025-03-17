import { Pool, PoolClient } from 'pg';

/**
 * Decorator for marking a class as a database table
 */
declare function Table(options: {
    name: string;
}): any;
/**
 * Decorator for marking a property as a database column
 */
declare function Column(options?: {
    name?: string;
    primary?: boolean;
    nullable?: boolean;
    unique?: boolean;
    type?: string;
    default?: () => string;
}): (target: any, context: ClassFieldDecoratorContext | string) => void;
/**
 * Decorator for marking a property as a foreign key
 */
declare function ForeignKey(tableName: string, columnName: string): (target: any, context: ClassFieldDecoratorContext | string) => void;
/**
 * Decorator for vector columns
 * @param dimensions The dimensions of the vector
 * @returns The decorator function
 */
declare function VectorColumn(dimensions: number): (target: any, context: ClassFieldDecoratorContext | string) => void;

interface EntityBase {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
interface ColumnMetadata {
    name: string;
    primary?: boolean;
    nullable?: boolean;
    unique?: boolean;
    type: string;
    default?: () => string;
    isVector?: boolean;
}
interface VectorEmbedding {
    id: string;
    entryId: string;
    embedding: number[];
}
declare let pool: Pool;

/**
 * Find a single entity by criteria
 * @param entityClass The entity class to query
 * @param criteria The criteria to filter by
 * @param client Optional database client for transaction support
 * @returns The found entity or null if not found
 */
declare function findBy<T extends EntityBase>(entityClass: new () => T, criteria: Partial<T>, client?: PoolClient | Pool): Promise<T | null>;
/**
 * List all entities matching the criteria
 * @param entityClass The entity class to query
 * @param criteria The criteria to filter by
 * @param client Optional database client for transaction support
 * @returns An array of entities
 */
declare function listAll<T extends EntityBase>(entityClass: new () => T, criteria?: Partial<T>, client?: PoolClient | Pool): Promise<T[]>;
/**
 * Execute a raw SQL query
 * @param sql The SQL query to execute
 * @param params The parameters for the query
 * @param client Optional database client for transaction support
 * @returns The query result rows
 */
declare function query<T = any>(sql: string, params?: Record<string, any>, client?: PoolClient | Pool): Promise<T[]>;
/**
 * Save an entity to the database
 * @param entity The entity to save
 * @param client Optional database client for transaction support
 * @returns The saved entity
 */
declare function save<T extends EntityBase>(entity: T, client?: PoolClient | Pool): Promise<T>;
/**
 * Delete entities matching the criteria
 * @param entityClass The entity class to delete from
 * @param criteria The criteria to filter by
 * @param client Optional database client for transaction support
 * @returns The number of deleted entities
 */
declare function deleteBy<T extends EntityBase>(entityClass: new () => T, criteria: Partial<T>, client?: PoolClient | Pool): Promise<number>;

/**
 * Format a number array as a PostgreSQL vector string
 * @param vector The vector to format
 * @returns The formatted vector string
 */
declare function formatVector(vector: number[]): string;
/**
 * Ensure a vector has the correct dimensionality
 * @param vector The vector to check
 * @param dimensions The expected dimensions
 * @returns The vector with the correct dimensionality
 */
declare function ensureVectorDimensions(vector: number[], dimensions: number): number[];
/**
 * Process vector embeddings for an entity
 * @param entity The entity to process
 * @param entityClass The entity class
 */
declare function processVectorEmbeddings<T extends object>(entity: T, entityClass: new () => T): void;
/**
 * Store an embedding vector for an entry
 * @param entryId The ID of the entry
 * @param embedding The embedding vector
 * @param client Optional database client for transaction support
 * @returns The stored embedding entity
 */
declare function storeEmbedding(entryId: string, embedding: number[], client?: Pool | PoolClient): Promise<VectorEmbedding>;
/**
 * Find entries similar to a given embedding vector
 * @param embedding The embedding vector to compare against
 * @param limit The maximum number of results to return (default: 10)
 * @param similarityThreshold The minimum similarity threshold (default: 0.5)
 * @param client Optional database client for transaction support
 * @returns An array of entry IDs and their similarity scores
 */
declare function findSimilarEntries(embedding: number[], limit?: number, similarityThreshold?: number, client?: Pool | PoolClient): Promise<Array<{
    entryId: string;
    similarity: number;
}>>;

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
declare function withTransaction<T>(callback: (client: PoolClient) => Promise<T>, existingClient?: PoolClient): Promise<T>;
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
declare function withSavepoint<T>(name: string, callback: () => Promise<T>, client: PoolClient): Promise<T>;

/**
 * Run the migration
 * @param pool The database connection pool to use
 * @param dryRun If true, only show the SQL that would be executed without actually running it
 * @param entityClasses Optional array of entity classes to use for migration (if not provided, will load from db/entities)
 */
declare function runMigration(pool?: Pool, dryRun?: boolean, entityClasses?: any[]): Promise<string>;

interface ColumnInfo {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
    is_unique?: boolean;
}
interface TableInfo {
    columns: ColumnInfo[];
    primaryKey: string[];
    foreignKeys: {
        column_name: string;
        foreign_table_name: string;
        foreign_column_name: string;
    }[];
    indexes: {
        index_name: string;
        column_names: string[];
        is_unique: boolean;
    }[];
}
interface DatabaseSchema {
    [tableName: string]: TableInfo;
}
/**
 * Quote an identifier if it's a reserved keyword or contains special characters
 */
declare function quoteIdentifier(identifier: string): string;
/**
 * Escape a string for SQL
 */
declare function escapeSqlString(value: string): string;
/**
 * Check if a value is a SQL function call
 */
declare function isSqlFunction(value: any): boolean;
/**
 * Load all entity classes from the project
 */
declare function loadEntityClasses(): Promise<any[]>;
/**
 * Get the current database schema
 */
declare function getCurrentSchema(pool: Pool): Promise<DatabaseSchema>;
/**
 * Generate SQL for creating a table
 */
declare function generateTableSQL(entityClass: any, includeForeignKeys?: boolean): string;
/**
 * Generate SQL for altering a table to match the entity definition
 */
declare function generateAlterTableSQL(entityClass: any, tableInfo: TableInfo): string;
/**
 * Generate SQL for creating or altering tables based on entity definitions
 */
declare function generateMigrationSQL(entityClasses: any[], currentSchema: DatabaseSchema): string;
/**
 * Infers the SQL type from a TypeScript property type
 */
declare function inferType(target: any, propertyKey: string): string;
/**
 * Infers the SQL type from a property's initialization value
 * This is used as a fallback when the type metadata is Object (which happens with union types)
 */
declare function inferTypeFromValue(target: any, propertyKey: string): string | null;

export { Column, ColumnMetadata, EntityBase, ForeignKey, Table, VectorColumn, VectorEmbedding, deleteBy, ensureVectorDimensions, escapeSqlString, findBy, findSimilarEntries, formatVector, generateAlterTableSQL, generateMigrationSQL, generateTableSQL, getCurrentSchema, inferType, inferTypeFromValue, isSqlFunction, listAll, loadEntityClasses, pool, processVectorEmbeddings, query, quoteIdentifier, runMigration, save, storeEmbedding, withSavepoint, withTransaction };

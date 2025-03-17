import { Pool, PoolConfig } from 'pg';
export interface EntityBase {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
export interface ColumnMetadata {
    name: string;
    primary?: boolean;
    nullable?: boolean;
    unique?: boolean;
    type: string;
    default?: () => string;
    isVector?: boolean;
}
export interface VectorEmbedding {
    id: string;
    entryId: string;
    embedding: number[];
}
export declare let pool: Pool;
/**
 * Initialize the database connection pool
 * @param config Optional configuration for the pool
 * @returns The initialized pool instance
 */
export declare const initializePool: (config?: PoolConfig) => Pool;
/**
 * Get the current database pool instance
 * @returns The current pool instance
 * @throws Error if the pool has not been initialized
 */
export declare const getPool: () => Pool;

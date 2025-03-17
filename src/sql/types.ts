import { Pool, PoolConfig } from 'pg';

// Define a base interface for entities
export interface EntityBase {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Define column metadata interface
export interface ColumnMetadata {
  name: string;
  primary?: boolean;
  nullable?: boolean;
  unique?: boolean;
  type: string;
  default?: () => string;
  isVector?: boolean;
}

// Interface for vector embeddings
export interface VectorEmbedding {
  id: string;
  entryId: string;
  embedding: number[];
}

// Database connection pool
export let pool: Pool;

/**
 * Initialize the database connection pool
 * @param config Optional configuration for the pool
 * @returns The initialized pool instance
 */
export const initializePool = (config?: PoolConfig): Pool => {
  const defaultConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
  };
  
  pool = new Pool({ ...defaultConfig, ...config });
  return pool;
};

/**
 * Get the current database pool instance
 * @returns The current pool instance
 * @throws Error if the pool has not been initialized
 */
export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}; 
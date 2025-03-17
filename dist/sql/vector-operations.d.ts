import { PoolClient, Pool } from 'pg';
import { VectorEmbedding } from './types';
/**
 * Format a number array as a PostgreSQL vector string
 * @param vector The vector to format
 * @returns The formatted vector string
 */
export declare function formatVector(vector: number[]): string;
/**
 * Ensure a vector has the correct dimensionality
 * @param vector The vector to check
 * @param dimensions The expected dimensions
 * @returns The vector with the correct dimensionality
 */
export declare function ensureVectorDimensions(vector: number[], dimensions: number): number[];
/**
 * Process vector embeddings for an entity
 * @param entity The entity to process
 * @param entityClass The entity class
 */
export declare function processVectorEmbeddings<T extends object>(entity: T, entityClass: new () => T): void;
/**
 * Store an embedding vector for an entry
 * @param entryId The ID of the entry
 * @param embedding The embedding vector
 * @param client Optional database client for transaction support
 * @returns The stored embedding entity
 */
export declare function storeEmbedding(entryId: string, embedding: number[], client?: Pool | PoolClient): Promise<VectorEmbedding>;
/**
 * Find entries similar to a given embedding vector
 * @param embedding The embedding vector to compare against
 * @param limit The maximum number of results to return (default: 10)
 * @param similarityThreshold The minimum similarity threshold (default: 0.5)
 * @param client Optional database client for transaction support
 * @returns An array of entry IDs and their similarity scores
 */
export declare function findSimilarEntries(embedding: number[], limit?: number, similarityThreshold?: number, client?: Pool | PoolClient): Promise<Array<{
    entryId: string;
    similarity: number;
}>>;

import { PoolClient, Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { pool, VectorEmbedding } from './types';

/**
 * Format a number array as a PostgreSQL vector string
 * @param vector The vector to format
 * @returns The formatted vector string
 */
export function formatVector(vector: number[]): string {
  if (!vector || !Array.isArray(vector)) {
    throw new Error('Vector must be an array of numbers');
  }

  // PostgreSQL pgvector expects vectors in the format [n1,n2,n3,...]
  return `[${vector.join(',')}]`;
}

/**
 * Ensure a vector has the correct dimensionality
 * @param vector The vector to check
 * @param dimensions The expected dimensions
 * @returns The vector with the correct dimensionality
 */
export function ensureVectorDimensions(
  vector: number[],
  dimensions: number
): number[] {
  if (!vector || !Array.isArray(vector)) {
    console.warn(`Invalid vector: ${vector}`);
    return Array(dimensions).fill(0);
  }

  if (vector.length !== dimensions) {
    console.warn(
      `Expected embedding dimension of ${dimensions}, but got ${vector.length}. Padding or truncating.`
    );

    if (vector.length > dimensions) {
      // Truncate
      return vector.slice(0, dimensions);
    } else {
      // Pad with zeros
      return [...vector, ...Array(dimensions - vector.length).fill(0)];
    }
  }

  return vector;
}

/**
 * Process vector embeddings for an entity
 * @param entity The entity to process
 * @param entityClass The entity class
 */
export function processVectorEmbeddings<T extends object>(
  entity: T,
  entityClass: new () => T
): void {
  const vectorColumns = Reflect.getMetadata('vector_columns', entityClass);

  // If no vector columns, nothing to do
  if (!vectorColumns) {
    return;
  }

  const columns = Reflect.getMetadata('columns', entityClass) as Record<
    string,
    any
  >;

  // Process each vector column
  for (const [key, dimensions] of Object.entries<number>(vectorColumns)) {
    const value = entity[key as keyof T];

    // Skip if no value
    if (!value || !Array.isArray(value)) {
      continue;
    }

    // Ensure vector has correct dimensions
    const adjustedVector = ensureVectorDimensions(value, dimensions);

    // Update the entity with the adjusted vector
    entity[key as keyof T] = adjustedVector as any;
  }
}

/**
 * Store an embedding vector for an entry
 * @param entryId The ID of the entry
 * @param embedding The embedding vector
 * @param client Optional database client for transaction support
 * @returns The stored embedding entity
 */
export async function storeEmbedding(
  entryId: string,
  embedding: number[],
  client: Pool | PoolClient = pool
): Promise<VectorEmbedding> {
  // Ensure the embedding has the correct dimensionality
  const adjustedEmbedding = ensureVectorDimensions(embedding, 1536);
  const formattedVector = formatVector(adjustedEmbedding);

  let localClient: PoolClient | null = null;
  let shouldReleaseClient = false;

  try {
    // Get a client from the pool if not provided or if a Pool is provided
    if (client instanceof Pool) {
      localClient = await client.connect();
      shouldReleaseClient = true;
    } else {
      // Client is already a PoolClient
      localClient = client;
    }

    // Check if the entry exists
    const entryExists = await localClient.query(
      'SELECT 1 FROM entry WHERE id = $1',
      [entryId]
    );

    if (entryExists.rowCount === 0) {
      throw new Error(`Entry with ID ${entryId} does not exist`);
    }

    // Check if an embedding already exists for this entry
    const existingEmbedding = await localClient.query(
      'SELECT id FROM entry_embedding WHERE entry_id = $1',
      [entryId]
    );

    if (existingEmbedding.rowCount && existingEmbedding.rowCount > 0) {
      // Update the existing embedding
      await localClient.query(
        'UPDATE entry_embedding SET embedding = $1, updated_at = NOW() WHERE entry_id = $2',
        [formattedVector, entryId]
      );

      return {
        id: existingEmbedding.rows[0].id,
        entryId,
        embedding: adjustedEmbedding,
      };
    } else {
      // Create a new embedding
      const result = await localClient.query(
        'INSERT INTO entry_embedding (id, entry_id, embedding, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
        [uuidv4(), entryId, formattedVector]
      );

      return {
        id: result.rows[0].id,
        entryId,
        embedding: adjustedEmbedding,
      };
    }
  } catch (error) {
    console.error('Error storing embedding:', error);
    throw error;
  } finally {
    // Release the client back to the pool if we acquired it
    if (shouldReleaseClient && localClient) {
      localClient.release();
    }
  }
}

/**
 * Find entries similar to a given embedding vector
 * @param embedding The embedding vector to compare against
 * @param limit The maximum number of results to return (default: 10)
 * @param similarityThreshold The minimum similarity threshold (default: 0.5)
 * @param client Optional database client for transaction support
 * @returns An array of entry IDs and their similarity scores
 */
export async function findSimilarEntries(
  embedding: number[],
  limit: number = 10,
  similarityThreshold: number = 0.5,
  client: Pool | PoolClient = pool
): Promise<Array<{ entryId: string; similarity: number }>> {
  // Ensure the embedding has the correct dimensionality
  const adjustedEmbedding = ensureVectorDimensions(embedding, 1536);
  const formattedVector = formatVector(adjustedEmbedding);

  let localClient: PoolClient | null = null;
  let shouldReleaseClient = false;

  try {
    // Get a client from the pool if not provided or if a Pool is provided
    if (client instanceof Pool) {
      localClient = await client.connect();
      shouldReleaseClient = true;
    } else {
      // Client is already a PoolClient
      localClient = client;
    }

    // Query for similar entries
    const result = await localClient.query(
      `
      SELECT 
        entry_id, 
        1 - (embedding <=> $1) as similarity
      FROM 
        entry_embedding
      WHERE 
        1 - (embedding <=> $1) > $2
      ORDER BY 
        similarity DESC
      LIMIT $3
      `,
      [formattedVector, similarityThreshold, limit]
    );

    return result.rows.map(row => ({
      entryId: row.entry_id,
      similarity: row.similarity,
    }));
  } catch (error) {
    console.error('Error finding similar entries:', error);
    return [];
  } finally {
    // Release the client back to the pool if we acquired it
    if (shouldReleaseClient && localClient) {
      localClient.release();
    }
  }
}

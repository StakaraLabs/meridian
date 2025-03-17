import { PoolClient, Pool } from 'pg';
import { EntityBase } from './types';
/**
 * Find a single entity by criteria
 * @param entityClass The entity class to query
 * @param criteria The criteria to filter by
 * @param client Optional database client for transaction support
 * @returns The found entity or null if not found
 */
export declare function findBy<T extends EntityBase>(entityClass: new () => T, criteria: Partial<T>, client?: PoolClient | Pool): Promise<T | null>;
/**
 * List all entities matching the criteria
 * @param entityClass The entity class to query
 * @param criteria The criteria to filter by
 * @param client Optional database client for transaction support
 * @returns An array of entities
 */
export declare function listAll<T extends EntityBase>(entityClass: new () => T, criteria?: Partial<T>, client?: PoolClient | Pool): Promise<T[]>;
/**
 * Execute a raw SQL query
 * @param sql The SQL query to execute
 * @param params The parameters for the query
 * @param client Optional database client for transaction support
 * @returns The query result rows
 */
export declare function query<T = any>(sql: string, params?: Record<string, any>, client?: PoolClient | Pool): Promise<T[]>;
/**
 * Save an entity to the database
 * @param entity The entity to save
 * @param client Optional database client for transaction support
 * @returns The saved entity
 */
export declare function save<T extends EntityBase>(entity: T, client?: PoolClient | Pool): Promise<T>;
/**
 * Delete entities matching the criteria
 * @param entityClass The entity class to delete from
 * @param criteria The criteria to filter by
 * @param client Optional database client for transaction support
 * @returns The number of deleted entities
 */
export declare function deleteBy<T extends EntityBase>(entityClass: new () => T, criteria: Partial<T>, client?: PoolClient | Pool): Promise<number>;
/**
 * Map a database row to an entity
 * @param row The database row
 * @param entityClass The entity class
 * @returns The mapped entity properties
 */
export declare function mapRowToEntity<T extends EntityBase>(row: any, entityClass: new () => T): Partial<T>;

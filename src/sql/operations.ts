import { PoolClient, Pool } from 'pg';
import crypto from 'crypto';
import { processVectorEmbeddings, formatVector } from './vector-operations';
import { EntityBase, ColumnMetadata, pool } from './types';

/**
 * Find a single entity by criteria
 * @param entityClass The entity class to query
 * @param criteria The criteria to filter by
 * @param client Optional database client for transaction support
 * @returns The found entity or null if not found
 */
export async function findBy<T extends EntityBase>(
  entityClass: new () => T,
  criteria: Partial<T>,
  client: PoolClient | Pool = pool
): Promise<T | null> {
  const tableName = Reflect.getMetadata('table:name', entityClass);
  const columns = getAllColumnsFromHierarchy(entityClass);
  
  const conditions = [];
  const values = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(criteria)) {
    if (value !== undefined) {
      // Get the column metadata if available
      const meta = columns[key];
      
      if (!meta) {
        throw new Error(`Property ${key} is not decorated with @Column`);
      }
      
      // Use the column name from metadata
      const columnName = meta.name;
      
      conditions.push(`${columnName} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }
  
  // If no conditions, return null
  if (conditions.length === 0) {
    return null;
  }
  
  const query = `
    SELECT * FROM ${tableName}
    WHERE ${conditions.join(' AND ')}
    LIMIT 1
  `;
  
  const result = await client.query(query, values);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  // Create a new instance of the entity
  const entity = new entityClass();
  
  // Map the result to the entity
  Object.assign(entity, mapRowToEntity(result.rows[0], entityClass));
  
  return entity;
}

/**
 * List all entities matching the criteria
 * @param entityClass The entity class to query
 * @param criteria The criteria to filter by
 * @param client Optional database client for transaction support
 * @returns An array of entities
 */
export async function listAll<T extends EntityBase>(
  entityClass: new () => T,
  criteria: Partial<T> = {},
  client: PoolClient | Pool = pool
): Promise<T[]> {
  const tableName = Reflect.getMetadata('table:name', entityClass);
  const columns = getAllColumnsFromHierarchy(entityClass);
  
  const conditions = [];
  const values = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(criteria)) {
    if (value !== undefined) {
      // Get the column metadata if available
      const meta = columns[key];
      
      if (!meta) {
        throw new Error(`Property ${key} is not decorated with @Column`);
      }
      
      // Use the column name from metadata
      const columnName = meta.name;
      
      conditions.push(`${columnName} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }
  
  let query = `SELECT * FROM ${tableName}`;
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  const result = await client.query(query, values);
  
  // Map the results to entities
  return result.rows.map(row => {
    const entity = new entityClass();
    Object.assign(entity, mapRowToEntity(row, entityClass));
    return entity;
  });
}

/**
 * Execute a raw SQL query
 * @param sql The SQL query to execute
 * @param params The parameters for the query
 * @param client Optional database client for transaction support
 * @returns The query result rows
 */
export async function query<T = any>(
  sql: string,
  params: Record<string, any> = {},
  client: PoolClient | Pool = pool
): Promise<T[]> {
  // Convert named parameters to positional parameters
  const { query, values } = convertNamedParams(sql, params);
  
  const result = await client.query(query, values);
  return result.rows;
}

/**
 * Save an entity to the database
 * @param entity The entity to save
 * @param client Optional database client for transaction support
 * @returns The saved entity
 */
export async function save<T extends EntityBase>(
  entity: T,
  client: PoolClient | Pool = pool
): Promise<T> {
  const constructor = entity.constructor as new () => T;
  const tableName = Reflect.getMetadata('table:name', constructor);
  const columns = getAllColumnsFromHierarchy(constructor);
  
  // Process vector embeddings if any
  processVectorEmbeddings(entity, constructor);
  
  // Check if the entity has an ID
  const isNew = !entity.id;
  
  if (isNew) {
    // Generate a new ID
    entity.id = crypto.randomUUID();
    
    // Set created and updated timestamps
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    
    // Build the insert query
    const columnNames = [];
    const placeholders = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, meta] of Object.entries(columns)) {
      const value = entity[key as keyof T];
      
      if (value !== undefined) {
        // Use the column name from metadata
        const columnName = meta.name;
        
        columnNames.push(columnName);
        placeholders.push(`$${paramIndex}`);
        
        // Format vector values if needed
        if (meta.isVector && Array.isArray(value)) {
          values.push(formatVector(value));
        } else {
          values.push(value);
        }
        
        paramIndex++;
      }
    }
    
    const query = `
      INSERT INTO ${tableName} (${columnNames.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    // Update the entity with the returned values
    Object.assign(entity, mapRowToEntity(result.rows[0], constructor));
  } else {
    // Update an existing entity
    entity.updatedAt = new Date();
    
    // Build the update query
    const setExpressions = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, meta] of Object.entries(columns)) {
      const value = entity[key as keyof T];
      
      if (value !== undefined && 
          key !== 'id' && 
          key !== 'createdAt' && 
          key !== 'updatedAt' && 
          key !== 'deletedAt') {
        // Use the column name from metadata
        const columnName = meta.name;
        
        setExpressions.push(`${columnName} = $${paramIndex}`);
        
        // Format vector values if needed
        if (meta.isVector && Array.isArray(value)) {
          values.push(formatVector(value));
        } else {
          values.push(value);
        }
        
        paramIndex++;
      }
    }
    
    // Add updated_at
    setExpressions.push(`updated_at = $${paramIndex}`);
    values.push(entity.updatedAt);
    paramIndex++;
    
    // Add the ID for the WHERE clause
    values.push(entity.id);
    
    const query = `
      UPDATE ${tableName}
      SET ${setExpressions.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    // Update the entity with the returned values
    Object.assign(entity, mapRowToEntity(result.rows[0], constructor));
  }
  
  return entity;
}

/**
 * Delete entities matching the criteria
 * @param entityClass The entity class to delete from
 * @param criteria The criteria to filter by
 * @param client Optional database client for transaction support
 * @returns The number of deleted entities
 */
export async function deleteBy<T extends EntityBase>(
  entityClass: new () => T,
  criteria: Partial<T>,
  client: PoolClient | Pool = pool
): Promise<number> {
  const tableName = Reflect.getMetadata('table:name', entityClass);
  const columns = getAllColumnsFromHierarchy(entityClass);
  
  const conditions = [];
  const values = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(criteria)) {
    if (value !== undefined) {
      // Get the column metadata if available
      const meta = columns[key];
      
      if (!meta) {
        throw new Error(`Property ${key} is not decorated with @Column`);
      }
      
      // Use the column name from metadata
      const columnName = meta.name;
      
      conditions.push(`${columnName} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }
  
  // If no conditions, don't delete anything
  if (conditions.length === 0) {
    return 0;
  }
  
  const query = `
    DELETE FROM ${tableName}
    WHERE ${conditions.join(' AND ')}
  `;
  
  const result = await client.query(query, values);
  return result.rowCount || 0;
}

/**
 * Map a database row to an entity
 * @param row The database row
 * @param entityClass The entity class
 * @returns The mapped entity properties
 */
export function mapRowToEntity<T extends EntityBase>(
  row: any,
  entityClass: new () => T
): Partial<T> {
  const result: Partial<T> = {};
  const columns = getAllColumnsFromHierarchy(entityClass);
  
  for (const [key, meta] of Object.entries(columns)) {
    // Use the column name from metadata
    const columnName = meta.name;
    
    // Convert snake_case column names to camelCase property names
    const snakeCaseKey = columnName.toLowerCase();
    
    if (row[snakeCaseKey] !== undefined) {
      result[key as keyof T] = row[snakeCaseKey];
    }
  }
  
  return result;
}

/**
 * Get all columns from the class hierarchy
 * @param entityClass The entity class
 * @returns The combined columns metadata
 */
function getAllColumnsFromHierarchy<T>(
  entityClass: new () => T
): Record<string, ColumnMetadata> {
  const columns = Reflect.getMetadata('columns', entityClass) || {};
  
  // Get the prototype chain
  let proto = Object.getPrototypeOf(entityClass);
  
  while (proto && proto.name) {
    const parentColumns = Reflect.getMetadata('columns', proto);
    
    if (parentColumns) {
      // Merge parent columns with child columns (child overrides parent)
      Object.assign(columns, parentColumns);
    }
    
    proto = Object.getPrototypeOf(proto);
  }
  
  return columns;
}

/**
 * Convert named parameters to positional parameters
 * @param sql The SQL query with named parameters
 * @param params The named parameters
 * @returns The converted query and values
 */
function convertNamedParams(
  sql: string,
  params: Record<string, any>
): { query: string; values: any[] } {
  const values: any[] = [];
  const paramMap: Record<string, number> = {};
  
  // Replace named parameters with positional parameters
  let query = sql.replace(/:([\w\d_]+)/g, (match, name) => {
    if (params[name] === undefined) {
      throw new Error(`Missing parameter: ${name}`);
    }
    
    if (paramMap[name] === undefined) {
      paramMap[name] = values.length + 1;
      values.push(params[name]);
    }
    
    return `$${paramMap[name]}`;
  });
  
  return { query, values };
}

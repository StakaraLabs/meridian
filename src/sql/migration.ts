import 'reflect-metadata';
import { Pool, PoolClient } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { toSnakeCase } from './decorators';

// Types for metadata
interface TableMetadata {
  name: string;
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

interface ForeignKeyMetadata {
  tableName: string;
  columnName: string;
}

interface VectorColumnMetadata {
  dimensions: number;
}

// Types for database schema
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
export function quoteIdentifier(identifier: string): string {
  // List of PostgreSQL reserved keywords
  const reservedKeywords = [
    'all',
    'analyse',
    'analyze',
    'and',
    'any',
    'array',
    'as',
    'asc',
    'asymmetric',
    'authorization',
    'binary',
    'both',
    'case',
    'cast',
    'check',
    'collate',
    'column',
    'constraint',
    'create',
    'cross',
    'current_catalog',
    'current_date',
    'current_role',
    'current_schema',
    'current_time',
    'current_timestamp',
    'current_user',
    'default',
    'deferrable',
    'desc',
    'distinct',
    'do',
    'else',
    'end',
    'except',
    'false',
    'fetch',
    'for',
    'foreign',
    'freeze',
    'from',
    'full',
    'grant',
    'group',
    'having',
    'ilike',
    'in',
    'initially',
    'inner',
    'intersect',
    'into',
    'is',
    'isnull',
    'join',
    'lateral',
    'leading',
    'left',
    'like',
    'limit',
    'localtime',
    'localtimestamp',
    'natural',
    'not',
    'notnull',
    'null',
    'offset',
    'on',
    'only',
    'or',
    'order',
    'outer',
    'overlaps',
    'placing',
    'primary',
    'references',
    'returning',
    'right',
    'select',
    'session_user',
    'similar',
    'some',
    'symmetric',
    'table',
    'tablesample',
    'then',
    'to',
    'trailing',
    'true',
    'union',
    'unique',
    'user',
    'using',
    'variadic',
    'verbose',
    'when',
    'where',
    'window',
    'with',
  ];

  // Check if the identifier is a reserved keyword or contains special characters
  if (
    reservedKeywords.includes(identifier.toLowerCase()) ||
    /[^a-zA-Z0-9_]/.test(identifier) ||
    /^[0-9]/.test(identifier)
  ) {
    return `"${identifier}"`;
  }

  return identifier;
}

/**
 * Escape a string for SQL
 */
export function escapeSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Check if a value is a SQL function call
 */
export function isSqlFunction(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return /^[a-zA-Z0-9_]+\(.*\)$/.test(value);
}

/**
 * Load all entity classes from the project
 */
export async function loadEntityClasses(): Promise<any[]> {
  const entityClasses: any[] = [];

  // Use fs.readdirSync instead of glob
  const entitiesDir = path.join(process.cwd(), 'db', 'entities');

  try {
    // Get all files in the entities directory
    const files = fs.readdirSync(entitiesDir, { withFileTypes: true });

    // Process each file
    for (const file of files) {
      // Skip directories
      if (file.isDirectory()) {
        continue;
      }

      // Skip non-TypeScript/JavaScript files
      if (!file.name.endsWith('.ts') && !file.name.endsWith('.js')) {
        continue;
      }

      try {
        // Import the file
        const filePath = path.join(entitiesDir, file.name);
        const module = await import(filePath);

        // Extract all exported classes from the module
        for (const exportName of Object.keys(module)) {
          const exportedItem = module[exportName];

          // Check if it's a class with @Table decorator
          if (
            typeof exportedItem === 'function' &&
            Reflect.hasMetadata('table:name', exportedItem)
          ) {
            entityClasses.push(exportedItem);
          }
        }
      } catch (error) {
        console.warn(`Error loading entity file ${file.name}:`, error);
      }
    }
  } catch (error) {
    console.warn(`Error reading entities directory:`, error);
  }

  return entityClasses;
}

/**
 * Get the current database schema
 */
export async function getCurrentSchema(pool: Pool): Promise<DatabaseSchema> {
  const schema: DatabaseSchema = {};

  // Get all tables
  const tablesResult = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  `);

  for (const table of tablesResult.rows) {
    const tableName = table.table_name;
    schema[tableName] = {
      columns: [],
      primaryKey: [],
      foreignKeys: [],
      indexes: [],
    };

    // Get columns for this table
    const columnsResult = await pool.query(
      `
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
    `,
      [tableName]
    );

    schema[tableName].columns = columnsResult.rows;

    // Get primary key
    const primaryKeyResult = await pool.query(
      `
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass
      AND i.indisprimary
    `,
      [tableName]
    );

    schema[tableName].primaryKey = primaryKeyResult.rows.map(
      row => row.attname
    );

    // Get foreign keys
    const foreignKeysResult = await pool.query(
      `
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = $1
    `,
      [tableName]
    );

    schema[tableName].foreignKeys = foreignKeysResult.rows;

    // Get unique constraints
    const uniqueResult = await pool.query(
      `
      SELECT
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_name = $1
    `,
      [tableName]
    );

    // Mark columns with unique constraints
    for (const uniqueColumn of uniqueResult.rows) {
      const column = schema[tableName].columns.find(
        col => col.column_name === uniqueColumn.column_name
      );
      if (column) {
        column.is_unique = true;
      }
    }

    // Get indexes
    const indexesResult = await pool.query(
      `
      SELECT
        i.relname AS index_name,
        array_agg(a.attname) AS column_names,
        ix.indisunique AS is_unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relkind = 'r'
      AND t.relname = $1
      AND i.relname NOT IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = $1
        AND constraint_type IN ('PRIMARY KEY', 'UNIQUE')
      )
      GROUP BY i.relname, ix.indisunique
    `,
      [tableName]
    );

    schema[tableName].indexes = indexesResult.rows;
  }

  return schema;
}

/**
 * Generate SQL for creating a table
 */
export function generateTableSQL(
  entityClass: any,
  includeForeignKeys: boolean = true
): string {
  const tableName = Reflect.getMetadata('table:name', entityClass);

  // Use getAllColumnsFromHierarchy to get all columns from the class hierarchy
  const columns = getAllColumnsFromHierarchy(entityClass);

  const foreignKeys = Reflect.getMetadata('foreign_keys', entityClass) || {};
  const vectorColumns =
    Reflect.getMetadata('vector_columns', entityClass) || {};

  // Start building the CREATE TABLE statement
  let sql = `CREATE TABLE ${quoteIdentifier(tableName)} (\n`;

  // Add columns
  const columnDefinitions = [];
  const primaryKeyColumns = [];

  for (const [propertyKey, columnMetadata] of Object.entries(columns)) {
    const metadata = columnMetadata as ColumnMetadata;
    const columnName = metadata.name;

    // Skip vector columns, they'll be handled separately
    if (metadata.isVector) continue;

    let columnDef = `  ${quoteIdentifier(columnName)} ${metadata.type}`;

    // Add constraints
    if (metadata.primary) {
      primaryKeyColumns.push(columnName);
    }

    if (!metadata.nullable) {
      columnDef += ' NOT NULL';
    }

    if (metadata.unique) {
      columnDef += ' UNIQUE';
    }

    // Add default value if specified
    if (metadata.default) {
      const defaultValue = metadata.default();

      // Special handling for jsonb arrays
      if (metadata.type === 'jsonb' && defaultValue.startsWith('ARRAY[')) {
        // For the specific case of prompt_types in ai_settings
        if (propertyKey === 'promptTypes') {
          columnDef += ` DEFAULT '["reflection", "questions", "encouragement"]'::jsonb`;
        } else if (
          propertyKey === 'preferredTags' ||
          propertyKey === 'excludedTags'
        ) {
          columnDef += ` DEFAULT '[]'::jsonb`;
        } else {
          // Generic handling for other jsonb arrays
          try {
            const arrayContent = defaultValue.substring(
              6,
              defaultValue.length - 1
            );
            const jsonArray = arrayContent.split(',').map(item => {
              // Remove extra quotes and trim
              const trimmed = item.replace(/^'|'$/g, '').trim();
              return JSON.stringify(trimmed).replace(/^"|"$/g, '');
            });
            columnDef += ` DEFAULT '["${jsonArray.join('", "')}"]'::jsonb`;
          } catch (error) {
            console.error('Error parsing JSONB default value:', error);
            // Fallback to empty array if parsing fails
            columnDef += ` DEFAULT '[]'::jsonb`;
          }
        }
      } else if (metadata.type === 'jsonb') {
        // Handle other JSONB types that aren't arrays
        try {
          if (typeof defaultValue === 'string') {
            if (defaultValue.endsWith('::jsonb')) {
              // Already has the jsonb cast, just add quotes
              columnDef += ` DEFAULT '${defaultValue.replace(
                /::jsonb$/,
                ''
              )}'::jsonb`;
            } else if (
              defaultValue.startsWith('{') ||
              defaultValue.startsWith('[')
            ) {
              // Already JSON format, just add quotes and cast
              columnDef += ` DEFAULT '${defaultValue}'::jsonb`;
            } else {
              // Convert to JSON string
              columnDef += ` DEFAULT '${JSON.stringify(defaultValue)}'::jsonb`;
            }
          } else {
            // Convert to JSON string
            columnDef += ` DEFAULT '${JSON.stringify(defaultValue)}'::jsonb`;
          }
        } catch (error) {
          console.error('Error parsing JSONB default value:', error);
          columnDef += ` DEFAULT '{}'::jsonb`;
        }
      } else if (isSqlFunction(defaultValue)) {
        columnDef += ` DEFAULT ${defaultValue}`;
      } else {
        columnDef += ` DEFAULT ${escapeSqlString(defaultValue)}`;
      }
    }

    columnDefinitions.push(columnDef);
  }

  // Add primary key constraint if there are primary key columns
  if (primaryKeyColumns.length > 0) {
    const primaryKeyDef = `  PRIMARY KEY (${primaryKeyColumns
      .map(quoteIdentifier)
      .join(', ')})`;
    columnDefinitions.push(primaryKeyDef);
  }

  // Add foreign key constraints if requested
  if (includeForeignKeys) {
    for (const [propertyKey, fkMetadata] of Object.entries(foreignKeys)) {
      const metadata = fkMetadata as ForeignKeyMetadata;
      const columnMeta = columns[propertyKey] as ColumnMetadata;
      
      if (!columnMeta) {
        throw new Error(`Property ${propertyKey} is not decorated with @Column`);
      }
      
      const columnName = columnMeta.name;
      const fkDef = `  CONSTRAINT ${quoteIdentifier(
        `fk_${tableName}_${columnName}`
      )} FOREIGN KEY (${quoteIdentifier(
        columnName
      )}) REFERENCES ${quoteIdentifier(metadata.tableName)}(${quoteIdentifier(
        metadata.columnName
      )})`;
      columnDefinitions.push(fkDef);
    }
  }

  // Combine all column definitions
  sql += columnDefinitions.join(',\n');
  sql += '\n);\n';

  // Add vector columns if any
  for (const [propertyKey, dimensions] of Object.entries(vectorColumns)) {
    const columnMeta = columns[propertyKey] as ColumnMetadata;
    
    if (!columnMeta) {
      throw new Error(`Property ${propertyKey} is not decorated with @Column`);
    }
    
    const columnName = columnMeta.name;
    sql += `ALTER TABLE ${quoteIdentifier(
      tableName
    )} ADD COLUMN ${quoteIdentifier(columnName)} vector(${dimensions});\n`;
  }

  return sql;
}

/**
 * Helper function to get all columns from the class hierarchy
 */
function getAllColumnsFromHierarchy(entityClass: any): Record<string, any> {
  const result: Record<string, any> = {};
  let currentClass = entityClass;

  // Traverse the prototype chain to get all columns
  while (currentClass && currentClass.prototype) {
    const columns = Reflect.getMetadata('columns', currentClass) || {};

    // Add columns from the current class
    for (const [key, value] of Object.entries(columns)) {
      if (!result[key]) {
        result[key] = value;
      }
    }

    // Move up the prototype chain
    currentClass = Object.getPrototypeOf(currentClass);
  }

  return result;
}

/**
 * Generate SQL for altering a table to match the entity definition
 */
export function generateAlterTableSQL(
  entityClass: any,
  tableInfo: TableInfo
): string {
  const tableName = Reflect.getMetadata('table:name', entityClass);
  const columns = getAllColumnsFromHierarchy(entityClass);
  const foreignKeys = Reflect.getMetadata('foreign_keys', entityClass) || {};
  const vectorColumns =
    Reflect.getMetadata('vector_columns', entityClass) || {};

  let sql = '';

  // Check for missing columns
  for (const [propertyKey, columnMetadata] of Object.entries(columns)) {
    const metadata = columnMetadata as ColumnMetadata;
    const columnName = metadata.name;

    // Skip vector columns, they'll be handled separately
    if (metadata.isVector) continue;

    const existingColumn = tableInfo.columns.find(
      col => col.column_name === columnName
    );

    if (!existingColumn) {
      // Column doesn't exist, add it
      let columnDef = `${quoteIdentifier(columnName)} ${metadata.type}`;

      if (!metadata.nullable) {
        columnDef += ' NOT NULL';
      }

      if (metadata.unique) {
        columnDef += ' UNIQUE';
      }

      // Add default value if specified
      if (metadata.default) {
        const defaultValue = metadata.default();
        if (isSqlFunction(defaultValue)) {
          columnDef += ` DEFAULT ${defaultValue}`;
        } else {
          columnDef += ` DEFAULT ${escapeSqlString(defaultValue)}`;
        }
      }

      sql += `ALTER TABLE ${quoteIdentifier(
        tableName
      )} ADD COLUMN ${columnDef};\n`;
    } else {
      // Column exists, check if we need to modify it
      const modifications = [];

      // Check if nullability needs to be changed
      if (!metadata.nullable && existingColumn.is_nullable === 'YES') {
        modifications.push(
          `ALTER COLUMN ${quoteIdentifier(columnName)} SET NOT NULL`
        );
      } else if (metadata.nullable && existingColumn.is_nullable === 'NO') {
        modifications.push(
          `ALTER COLUMN ${quoteIdentifier(columnName)} DROP NOT NULL`
        );
      }

      // Check if type needs to be changed
      if (
        metadata.type.toLowerCase() !== existingColumn.data_type.toLowerCase()
      ) {
        modifications.push(
          `ALTER COLUMN ${quoteIdentifier(columnName)} TYPE ${
            metadata.type
          } USING ${quoteIdentifier(columnName)}::${metadata.type}`
        );
      }

      // Apply modifications if any
      if (modifications.length > 0) {
        sql += `ALTER TABLE ${quoteIdentifier(tableName)} ${modifications.join(
          ', '
        )};\n`;
      }
    }
  }

  // Check for missing foreign keys
  for (const [propertyKey, fkMetadata] of Object.entries(foreignKeys)) {
    const metadata = fkMetadata as ForeignKeyMetadata;
    const columnMeta = columns[propertyKey] as ColumnMetadata;
    
    if (!columnMeta) {
      throw new Error(`Property ${propertyKey} is not decorated with @Column`);
    }
    
    const columnName = columnMeta.name;

    const existingFk = tableInfo.foreignKeys.find(
      fk =>
        fk.column_name === columnName &&
        fk.foreign_table_name === metadata.tableName &&
        fk.foreign_column_name === metadata.columnName
    );

    if (!existingFk) {
      // Foreign key doesn't exist, add it
      sql += `ALTER TABLE ${quoteIdentifier(
        tableName
      )} ADD CONSTRAINT ${quoteIdentifier(
        `fk_${tableName}_${columnName}`
      )} FOREIGN KEY (${quoteIdentifier(
        columnName
      )}) REFERENCES ${quoteIdentifier(metadata.tableName)}(${quoteIdentifier(
        metadata.columnName
      )});\n`;
    }
  }

  // Check for missing vector columns
  for (const [propertyKey, dimensions] of Object.entries(vectorColumns)) {
    const columnMeta = columns[propertyKey] as ColumnMetadata;
    
    if (!columnMeta) {
      throw new Error(`Property ${propertyKey} is not decorated with @Column`);
    }
    
    const columnName = columnMeta.name;

    const existingColumn = tableInfo.columns.find(
      col => col.column_name === columnName
    );

    if (!existingColumn) {
      // Vector column doesn't exist, add it
      sql += `ALTER TABLE ${quoteIdentifier(
        tableName
      )} ADD COLUMN ${quoteIdentifier(columnName)} vector(${dimensions});\n`;
    }
  }

  return sql;
}

/**
 * Generate SQL to add foreign key constraints to a table
 */
export function generateForeignKeySQL(
  entityClass: any,
  currentSchema: DatabaseSchema
): string {
  const tableName = Reflect.getMetadata('table:name', entityClass);
  const columns = getAllColumnsFromHierarchy(entityClass);
  const foreignKeys = Reflect.getMetadata('foreign_keys', entityClass) || {};

  let sql = '';

  // Add foreign key constraints
  for (const [propertyKey, fkMetadata] of Object.entries(foreignKeys)) {
    const metadata = fkMetadata as ForeignKeyMetadata;
    const columnMeta = columns[propertyKey] as ColumnMetadata;
    
    if (!columnMeta) {
      throw new Error(`Property ${propertyKey} is not decorated with @Column`);
    }
    
    const columnName = columnMeta.name;
    const constraintName = `fk_${tableName}_${columnName}`;

    // Check if the constraint already exists in the current schema
    const tableInfo = currentSchema[tableName];
    const constraintExists =
      tableInfo &&
      tableInfo.foreignKeys &&
      tableInfo.foreignKeys.some(
        fk =>
          fk.column_name === columnName &&
          fk.foreign_table_name === metadata.tableName &&
          fk.foreign_column_name === metadata.columnName
      );

    if (!constraintExists) {
      sql += `ALTER TABLE ${quoteIdentifier(
        tableName
      )} ADD CONSTRAINT ${quoteIdentifier(
        constraintName
      )} FOREIGN KEY (${quoteIdentifier(
        columnName
      )}) REFERENCES ${quoteIdentifier(metadata.tableName)}(${quoteIdentifier(
        metadata.columnName
      )}) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;\n`;
    }
  }

  return sql;
}

/**
 * Generate SQL for creating or altering tables based on entity definitions
 */
export function generateMigrationSQL(
  entityClasses: any[],
  currentSchema: DatabaseSchema
): string {
  let sql = '';

  // Add vector extension if needed
  sql += 'CREATE EXTENSION IF NOT EXISTS vector;\n\n';

  // First pass: Create all tables without foreign keys
  sql += '-- First pass: Create all tables without foreign keys\n';
  for (const entityClass of entityClasses) {
    const tableName = Reflect.getMetadata('table:name', entityClass);

    if (!currentSchema[tableName]) {
      // Table doesn't exist, generate CREATE TABLE statement without foreign keys
      sql += `-- Creating table ${tableName}\n${generateTableSQL(
        entityClass,
        false
      )}\n`;
    } else {
      // Table exists, generate ALTER TABLE statements if needed
      const alterSql = generateAlterTableSQL(
        entityClass,
        currentSchema[tableName]
      );
      if (alterSql) {
        sql += `-- Altering table ${tableName}\n${alterSql}\n`;
      }
    }
  }

  // Second pass: Add foreign key constraints
  sql += '\n-- Second pass: Add foreign key constraints\n';
  for (const entityClass of entityClasses) {
    const tableName = Reflect.getMetadata('table:name', entityClass);
    const foreignKeys = Reflect.getMetadata('foreign_keys', entityClass) || {};

    if (Object.keys(foreignKeys).length > 0) {
      sql += `-- Adding foreign keys to ${tableName}\n${generateForeignKeySQL(
        entityClass,
        currentSchema
      )}\n`;
    }
  }

  return sql;
}

/**
 * Infers the SQL type from a TypeScript property type
 */
export function inferType(target: any, propertyKey: string): string {
  const type = Reflect.getMetadata('design:type', target, propertyKey);

  if (!type) return 'text';

  switch (type.name) {
    case 'String':
      return 'text';
    case 'Number':
      return 'double precision';
    case 'Boolean':
      return 'boolean';
    case 'Date':
      return 'timestamp with time zone';
    case 'Array':
      return 'jsonb';
    case 'Object':
      return 'jsonb';
    default:
      return 'text';
  }
}

/**
 * Infers the SQL type from a property's initialization value
 * This is used as a fallback when the type metadata is Object (which happens with union types)
 */
export function inferTypeFromValue(
  target: any,
  propertyKey: string
): string | null {
  // Try to get an instance of the class to check the property's value
  try {
    const instance = new target.constructor();
    const value = instance[propertyKey];

    if (value === undefined || value === null) {
      // Check if the property name suggests a specific type
      if (
        propertyKey.toLowerCase().includes('date') ||
        propertyKey.toLowerCase().includes('time')
      ) {
        return 'timestamp with time zone';
      }
      if (
        propertyKey.toLowerCase().includes('price') ||
        propertyKey.toLowerCase().includes('amount') ||
        propertyKey.toLowerCase().includes('number')
      ) {
        return 'double precision';
      }
      if (
        propertyKey.toLowerCase().includes('is') ||
        propertyKey.toLowerCase().includes('has') ||
        propertyKey.toLowerCase().includes('enable') ||
        propertyKey.toLowerCase().includes('disable')
      ) {
        return 'boolean';
      }

      // Default to text for nullable/undefined string-like properties
      return 'text';
    }

    // Infer type from the actual value
    if (typeof value === 'string') return 'text';
    if (typeof value === 'number') return 'double precision';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'timestamp with time zone';
    if (Array.isArray(value)) return 'jsonb';
    if (typeof value === 'object') return 'jsonb';
  } catch (error) {
    // If we can't create an instance, just return null to fall back to the default
    return null;
  }

  return null;
}

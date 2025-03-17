import 'reflect-metadata';

/**
 * Infers the SQL type from a TypeScript property type
 */
function inferType(target: any, propertyKey: string): string {
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
function inferTypeFromValue(target: any, propertyKey: string): string | null {
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

// Use a WeakMap to store metadata for each class separately
// This prevents cross-contamination between classes
const columnsMetadata = new WeakMap<Function, Record<string, any>>();
const foreignKeysMetadata = new WeakMap<Function, Record<string, any>>();
const vectorColumnsMetadata = new WeakMap<Function, Record<string, any>>();

/**
 * Decorator for marking a class as a database table
 */
export function Table(options: { name: string }) {
  return function (constructor: Function) {
    Reflect.defineMetadata('table:name', options.name, constructor);

    // Initialize empty metadata objects for this class
    if (!columnsMetadata.has(constructor)) {
      columnsMetadata.set(constructor, {});
    }

    if (!foreignKeysMetadata.has(constructor)) {
      foreignKeysMetadata.set(constructor, {});
    }

    if (!vectorColumnsMetadata.has(constructor)) {
      vectorColumnsMetadata.set(constructor, {});
    }

    // Store the metadata on the constructor as well for compatibility
    Reflect.defineMetadata(
      'columns',
      columnsMetadata.get(constructor),
      constructor
    );
    Reflect.defineMetadata(
      'foreign_keys',
      foreignKeysMetadata.get(constructor),
      constructor
    );
    Reflect.defineMetadata(
      'vector_columns',
      vectorColumnsMetadata.get(constructor),
      constructor
    );
  };
}

/**
 * Decorator for marking a property as a database column
 */
export function Column(
  options: {
    name?: string;
    primary?: boolean;
    nullable?: boolean;
    unique?: boolean;
    type?: string;
    default?: () => string;
  } = {}
) {
  return function (target: any, propertyKey: string) {
    // Get the constructor of the class
    const constructor = target.constructor;

    // Get the columns metadata for this specific class
    let metadata = columnsMetadata.get(constructor);
    if (!metadata) {
      metadata = {};
      columnsMetadata.set(constructor, metadata);
    }

    // Determine the SQL type
    let sqlType = options.type;

    if (!sqlType) {
      const inferredType = inferType(target, propertyKey);

      // If the inferred type is jsonb and it might be a union type with a primitive,
      // try to infer a more specific type from the property's value
      if (inferredType === 'jsonb') {
        const valueType = inferTypeFromValue(target, propertyKey);
        sqlType = valueType || inferredType;
      } else {
        sqlType = inferredType;
      }
    }

    metadata[propertyKey] = {
      name: options.name || propertyKey,
      primary: options.primary || false,
      nullable: options.nullable || false,
      unique: options.unique || false,
      type: sqlType,
      default: options.default,
    };

    // Store the updated metadata on the constructor for compatibility
    Reflect.defineMetadata('columns', metadata, constructor);
  };
}

/**
 * Decorator for marking a property as a foreign key
 */
export function ForeignKey(tableName: string, columnName: string) {
  return function (target: any, propertyKey: string) {
    // Get the constructor of the class
    const constructor = target.constructor;

    // Get the foreign keys metadata for this specific class
    let metadata = foreignKeysMetadata.get(constructor);
    if (!metadata) {
      metadata = {};
      foreignKeysMetadata.set(constructor, metadata);
    }

    metadata[propertyKey] = { tableName, columnName };

    // Store the updated metadata on the constructor for compatibility
    Reflect.defineMetadata('foreign_keys', metadata, constructor);
  };
}

/**
 * Convert a camelCase string to snake_case
 * @param str The string to convert
 * @returns The converted string
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Decorator for vector columns
 * @param dimensions The dimensions of the vector
 * @returns The decorator function
 */
export function VectorColumn(dimensions: number) {
  return function (target: any, propertyKey: string) {
    // Get the constructor of the class
    const constructor = target.constructor;

    // Get existing columns metadata
    let columns = columnsMetadata.get(constructor);
    if (!columns) {
      columns = {};
      columnsMetadata.set(constructor, columns);
    }

    // Add column metadata
    columns[propertyKey] = {
      name: toSnakeCase(propertyKey),
      isVector: true,
    };

    // Store columns metadata on the constructor for compatibility
    Reflect.defineMetadata('columns', columns, constructor);

    // Get existing vector columns metadata
    let vectorColumns = vectorColumnsMetadata.get(constructor);
    if (!vectorColumns) {
      vectorColumns = {};
      vectorColumnsMetadata.set(constructor, vectorColumns);
    }

    // Store vector dimensions
    vectorColumns[propertyKey] = dimensions;

    // Store vector columns metadata on the constructor for compatibility
    Reflect.defineMetadata('vector_columns', vectorColumns, constructor);
  };
}

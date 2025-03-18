// Decorators
export { Table, Column, ForeignKey, VectorColumn } from './decorators';

// Database operations
export { findBy, listAll, query, save, deleteBy } from './operations';

// Vector operations
export {
  storeEmbedding,
  findSimilarEntries,
  formatVector,
  ensureVectorDimensions,
  processVectorEmbeddings
} from './vector-operations';

// Transaction support
export { withTransaction, withSavepoint } from './transaction';

// Migration
export { runMigration } from './run-migration';
export {
  loadEntityClasses,
  getCurrentSchema,
  generateMigrationSQL,
  generateTableSQL,
  generateAlterTableSQL,
  quoteIdentifier,
  escapeSqlString,
  isSqlFunction,
  inferType,
  inferTypeFromValue
} from './migration';

// Types
export { EntityBase, ColumnMetadata, VectorEmbedding, pool, initializePool } from './types';

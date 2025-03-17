# Migration System Test Plan

## Overview

This document outlines a comprehensive test plan for the database migration system. The migration system is responsible for:

1. Loading entity classes from TypeScript files
2. Introspecting the current database schema
3. Generating SQL to create or alter tables based on entity definitions
4. Executing the SQL to update the database schema

## Unit Tests

### Utility Functions

- [x] `quoteIdentifier`: Test that it properly quotes reserved keywords and identifiers with special characters
- [x] `escapeSqlString`: Test that it properly escapes single quotes and wraps strings in quotes
- [x] `isSqlFunction`: Test that it correctly identifies SQL function calls
- [x] `inferType`: Test that it correctly infers SQL types from TypeScript types

### Schema Generation

- [x] `generateTableSQL`: Test that it generates correct SQL for tables with various column types and constraints
- [x] `generateMigrationSQL`: Test that it generates SQL in the correct order (respecting dependencies)
- [x] Test handling of vector columns and indexes
- [x] Test handling of circular dependencies between tables
- [x] Test dynamic dependency ordering for complex dependency graphs

### Schema Alteration

- [x] `generateAlterTableSQL`: Test that it generates correct ALTER TABLE statements for existing tables
- [x] Test adding missing columns to existing tables
- [x] Test modifying existing columns (nullability, default values, etc.)
- [x] Test adding missing foreign keys to existing tables
- [x] Test modifying existing foreign keys
- [x] Test adding missing vector columns and indexes
- [x] Test that no SQL is generated for tables that match the entity definitions

### Database Introspection

- [x] `getCurrentSchema`: Test that it correctly introspects the database schema
- [x] Test handling of tables, columns, constraints, and indexes

### Migration Execution

- [x] `runMigration`: Test that it correctly executes the migration SQL
- [x] Test error handling and rollback on failure
- [x] Test that it doesn't execute SQL if no changes are needed

## Integration Tests

- [ ] Test the full migration process with a real database
- [ ] Test migration of a complex schema with multiple tables and relationships
- [ ] Test migration of a schema with vector columns and indexes
- [x] Test migration of a schema with existing tables (ALTER TABLE)

## Edge Cases

- [x] Test handling of reserved keywords in table and column names
- [x] Test handling of special characters in identifiers
- [x] Test handling of default values with SQL functions
- [x] Test handling of default values with complex expressions
- [x] Test handling of nullable vs. non-nullable columns
- [x] Test handling of unique constraints
- [x] Test handling of foreign key constraints
- [x] Test handling of vector columns and indexes
- [x] Test handling of multiple foreign keys in a table
- [x] Test handling of tables with no foreign keys
- [x] Test handling of complex dependency graphs with multiple levels of dependencies
- [x] Test handling of circular dependencies with deferred constraints

## Regression Tests

- [x] Test that the migration system correctly handles the issues we've encountered:
  - [x] Handling of undefined types
  - [x] Proper quoting of identifiers
  - [x] Proper escaping of string values
  - [x] Proper handling of SQL functions in default values
  - [x] Proper handling of JSONB arrays in default values
  - [x] Proper handling of vector columns
  - [x] Proper handling of commas in SQL generation (no extra commas)

## Performance Tests

- [ ] Test migration performance with a large number of tables
- [ ] Test migration performance with a large number of columns
- [ ] Test migration performance with a large number of constraints

## Implementation Status

1. [x] Fix the current unit tests to ensure they pass
2. [x] Add more unit tests for the remaining functions
3. [ ] Add integration tests with a real database
4. [x] Add tests for edge cases and regression tests
5. [ ] Add performance tests
6. [x] Implement dynamic dependency ordering for table creation
7. [x] Implement ALTER TABLE functionality for existing tables
8. [x] Implement deferred foreign key constraints for circular dependencies

## Testing Strategy

For unit tests, we use real entity classes with decorators to test the migration system. This approach has several advantages:

1. Tests are more realistic and closer to actual usage
2. We don't need to mock Reflect.metadata, which makes tests more reliable
3. We can test the interaction between decorators and the migration system

For database interaction tests, we mock the Pool class from pg to avoid actual database connections. This allows us to test the database interaction code without needing a real database.

For integration tests, we'll need to set up a real PostgreSQL database in a Docker container to ensure the tests run in a controlled environment.

## Next Steps

1. Add integration tests with a real database
2. Add performance tests
3. Improve error handling and reporting
4. Add support for more complex schema changes (e.g., renaming columns, changing column types)
5. Add support for dropping columns and constraints that are no longer needed 
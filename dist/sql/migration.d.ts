import 'reflect-metadata';
import { Pool } from 'pg';
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
export declare function quoteIdentifier(identifier: string): string;
/**
 * Escape a string for SQL
 */
export declare function escapeSqlString(value: string): string;
/**
 * Check if a value is a SQL function call
 */
export declare function isSqlFunction(value: any): boolean;
/**
 * Load all entity classes from the project
 */
export declare function loadEntityClasses(): Promise<any[]>;
/**
 * Get the current database schema
 */
export declare function getCurrentSchema(pool: Pool): Promise<DatabaseSchema>;
/**
 * Generate SQL for creating a table
 */
export declare function generateTableSQL(entityClass: any, includeForeignKeys?: boolean): string;
/**
 * Generate SQL for altering a table to match the entity definition
 */
export declare function generateAlterTableSQL(entityClass: any, tableInfo: TableInfo): string;
/**
 * Generate SQL to add foreign key constraints to a table
 */
export declare function generateForeignKeySQL(entityClass: any, currentSchema: DatabaseSchema): string;
/**
 * Generate SQL for creating or altering tables based on entity definitions
 */
export declare function generateMigrationSQL(entityClasses: any[], currentSchema: DatabaseSchema): string;
/**
 * Infers the SQL type from a TypeScript property type
 */
export declare function inferType(target: any, propertyKey: string): string;
/**
 * Infers the SQL type from a property's initialization value
 * This is used as a fallback when the type metadata is Object (which happens with union types)
 */
export declare function inferTypeFromValue(target: any, propertyKey: string): string | null;
export {};

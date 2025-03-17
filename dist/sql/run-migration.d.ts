#!/usr/bin/env node
import 'reflect-metadata';
import { Pool } from 'pg';
/**
 * Ensure the vector extension is installed
 */
export declare function ensureVectorExtension(pool: Pool): Promise<void>;
/**
 * Run the migration
 * @param pool The database connection pool to use
 * @param dryRun If true, only show the SQL that would be executed without actually running it
 * @param entityClasses Optional array of entity classes to use for migration (if not provided, will load from db/entities)
 */
export declare function runMigration(pool?: Pool, dryRun?: boolean, entityClasses?: any[]): Promise<string>;

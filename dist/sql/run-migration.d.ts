#!/usr/bin/env node
import 'reflect-metadata';
import { Pool } from 'pg';
/**
 * Ensure the vector extension is installed
 */
export declare function ensureVectorExtension(pool: Pool): Promise<void>;
/**
 * Run the migration
 * @param dryRun If true, only show the SQL that would be executed without actually running it
 */
export declare function runMigration(dryRun?: boolean): Promise<void>;

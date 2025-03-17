import { Pool } from 'pg';
export interface EntityBase {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
export interface ColumnMetadata {
    name: string;
    primary?: boolean;
    nullable?: boolean;
    unique?: boolean;
    type: string;
    default?: () => string;
    isVector?: boolean;
}
export interface VectorEmbedding {
    id: string;
    entryId: string;
    embedding: number[];
}
export declare const pool: Pool;

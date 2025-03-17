import 'reflect-metadata';
/**
 * Base entity class that all domain entities should extend.
 * Provides common fields like id, createdAt, updatedAt, and deletedAt.
 */
export declare abstract class BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    constructor(data?: Partial<BaseEntity>);
}

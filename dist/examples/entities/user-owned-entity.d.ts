import 'reflect-metadata';
import { BaseEntity } from './base-entity';
/**
 * Base entity class for entities that belong to a user.
 * Extends BaseEntity and adds userId field and user reference.
 */
export declare abstract class UserOwnedEntity extends BaseEntity {
    userId: string;
    user?: any;
    constructor(data?: Partial<UserOwnedEntity>);
}

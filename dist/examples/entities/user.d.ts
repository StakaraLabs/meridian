import 'reflect-metadata';
import { BaseEntity } from './base-entity';
/**
 * User entity representing a user in the micro-blogging platform
 */
export declare class User extends BaseEntity {
    username: string;
    email?: string;
    emailVerified?: Date;
    password?: string;
    displayName?: string;
    bio?: string;
    profileImage?: string;
    constructor(data?: Partial<User>);
}

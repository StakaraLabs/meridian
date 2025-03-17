import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { User } from './user';
/**
 * Follow entity representing user following relationships
 */
export declare class Follow extends BaseEntity {
    followerId: string;
    followedId: string;
    follower?: User;
    followed?: User;
    constructor(data?: Partial<Follow>);
}

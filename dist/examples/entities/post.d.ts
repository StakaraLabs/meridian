import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { User } from './user';
/**
 * Post entity representing a micro-blog post
 */
export declare class Post extends BaseEntity {
    userId: string;
    content: string;
    isPublished: boolean;
    viewCount: number;
    user?: User;
    constructor(data?: Partial<Post>);
}

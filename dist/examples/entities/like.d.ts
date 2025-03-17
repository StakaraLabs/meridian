import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { User } from './user';
import { Post } from './post';
import { Comment } from './comment';
/**
 * Like entity representing likes on posts and comments
 */
export declare class Like extends BaseEntity {
    userId: string;
    postId?: string;
    commentId?: string;
    user?: User;
    post?: Post;
    comment?: Comment;
    constructor(data?: Partial<Like>);
}

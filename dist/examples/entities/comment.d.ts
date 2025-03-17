import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { User } from './user';
import { Post } from './post';
/**
 * Comment entity representing a comment on a post
 */
export declare class Comment extends BaseEntity {
    postId: string;
    userId: string;
    content: string;
    parentId?: string;
    user?: User;
    post?: Post;
    parent?: Comment;
    constructor(data?: Partial<Comment>);
}

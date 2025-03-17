import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { Post } from './post';
import { Tag } from './tag';
/**
 * PostTag entity representing the many-to-many relationship between Posts and Tags
 */
export declare class PostTag extends BaseEntity {
    postId: string;
    tagId: string;
    post?: Post;
    tag?: Tag;
    constructor(data?: Partial<PostTag>);
}

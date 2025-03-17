import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { Post } from './post';
/**
 * PostEmbedding entity representing vector embeddings for posts
 */
export declare class PostEmbedding extends BaseEntity {
    postId: string;
    embedding: number[];
    post?: Post;
    constructor(data?: Partial<PostEmbedding>);
}

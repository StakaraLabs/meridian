import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { Post } from './post';
/**
 * PostAnalytics entity representing detailed analytics for posts
 */
export declare class PostAnalytics extends BaseEntity {
    postId: string;
    impressions: number;
    clickThroughRate: number;
    averageReadTime: number;
    post?: Post;
    constructor(data?: Partial<PostAnalytics>);
}

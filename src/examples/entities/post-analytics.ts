import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { Post } from './post';
import { Table, Column, ForeignKey } from '../../sql/decorators';

/**
 * PostAnalytics entity representing detailed analytics for posts
 */
@Table({ name: 'post_analytics' })
export class PostAnalytics extends BaseEntity {
  @Column({ name: 'post_id', unique: true })
  @ForeignKey('posts', 'id')
  postId: string;

  @Column({ default: () => '0' })
  impressions: number;

  @Column({ name: 'click_through_rate', default: () => '0' })
  clickThroughRate: number;

  @Column({ name: 'average_read_time', default: () => '0' })
  averageReadTime: number;

  // Reference to the post (not stored in database)
  post?: Post;
  
  constructor(data?: Partial<PostAnalytics>) {
    super(data);
    this.postId = data?.postId || '';
    this.impressions = data?.impressions ?? 0;
    this.clickThroughRate = data?.clickThroughRate ?? 0;
    this.averageReadTime = data?.averageReadTime ?? 0;
    this.post = data?.post;
  }
} 
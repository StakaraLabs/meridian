import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { User } from './user';
import { Table, Column, ForeignKey } from '../../sql/decorators';

/**
 * Post entity representing a micro-blog post
 */
@Table({ name: 'posts' })
export class Post extends BaseEntity {
  @Column({ name: 'user_id' })
  @ForeignKey('users', 'id')
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_published', default: () => 'true' })
  isPublished: boolean;

  @Column({ name: 'view_count', default: () => '0' })
  viewCount: number;

  // Reference to the user (not stored in database)
  user?: User;
  
  constructor(data?: Partial<Post>) {
    super(data);
    this.userId = data?.userId || '';
    this.content = data?.content || '';
    this.isPublished = data?.isPublished ?? true;
    this.viewCount = data?.viewCount ?? 0;
    this.user = data?.user;
  }
} 
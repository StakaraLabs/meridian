import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { Post } from './post';
import { Tag } from './tag';
import { Table, Column, ForeignKey } from '../../sql/decorators';

/**
 * PostTag entity representing the many-to-many relationship between Posts and Tags
 */
@Table({ name: 'post_tags' })
export class PostTag extends BaseEntity {
  @Column({ name: 'post_id' })
  @ForeignKey('posts', 'id')
  postId: string;

  @Column({ name: 'tag_id' })
  @ForeignKey('tags', 'id')
  tagId: string;

  // References (not stored in database)
  post?: Post;
  tag?: Tag;
  
  constructor(data?: Partial<PostTag>) {
    super(data);
    this.postId = data?.postId || '';
    this.tagId = data?.tagId || '';
    this.post = data?.post;
    this.tag = data?.tag;
  }
} 
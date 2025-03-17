import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { User } from './user';
import { Post } from './post';
import { Table, Column, ForeignKey } from '../../sql/decorators';

/**
 * Comment entity representing a comment on a post
 */
@Table({ name: 'comments' })
export class Comment extends BaseEntity {
  @Column({ name: 'post_id' })
  @ForeignKey('posts', 'id')
  postId: string;

  @Column({ name: 'user_id' })
  @ForeignKey('users', 'id')
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'parent_id', nullable: true })
  @ForeignKey('comments', 'id')
  parentId?: string;

  // References (not stored in database)
  user?: User;
  post?: Post;
  parent?: Comment;
  
  constructor(data?: Partial<Comment>) {
    super(data);
    this.postId = data?.postId || '';
    this.userId = data?.userId || '';
    this.content = data?.content || '';
    this.parentId = data?.parentId;
    this.user = data?.user;
    this.post = data?.post;
    this.parent = data?.parent;
  }
} 
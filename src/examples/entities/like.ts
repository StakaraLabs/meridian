import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { User } from './user';
import { Post } from './post';
import { Comment } from './comment';
import { Table, Column, ForeignKey } from '../../sql/decorators';

/**
 * Like entity representing likes on posts and comments
 */
@Table({ name: 'likes' })
export class Like extends BaseEntity {
  @Column({ name: 'user_id' })
  @ForeignKey('users', 'id')
  userId: string;

  @Column({ name: 'post_id', nullable: true })
  @ForeignKey('posts', 'id')
  postId?: string;

  @Column({ name: 'comment_id', nullable: true })
  @ForeignKey('comments', 'id')
  commentId?: string;

  // References (not stored in database)
  user?: User;
  post?: Post;
  comment?: Comment;
  
  constructor(data?: Partial<Like>) {
    super(data);
    this.userId = data?.userId || '';
    this.postId = data?.postId;
    this.commentId = data?.commentId;
    this.user = data?.user;
    this.post = data?.post;
    this.comment = data?.comment;
  }
} 

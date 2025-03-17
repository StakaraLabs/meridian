import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { Post } from './post';
import { Table, Column, ForeignKey, VectorColumn } from '../../sql/decorators';

/**
 * PostEmbedding entity representing vector embeddings for posts
 */
@Table({ name: 'post_embeddings' })
export class PostEmbedding extends BaseEntity {
  @Column({ name: 'post_id', unique: true })
  @ForeignKey('posts', 'id')
  postId: string;

  @VectorColumn(1536)
  embedding: number[];
  
  // Reference to the post (not stored in database)
  post?: Post;
  
  constructor(data?: Partial<PostEmbedding>) {
    super(data);
    this.postId = data?.postId || '';
    this.post = data?.post;
    this.embedding = data?.embedding || [];
  }
} 
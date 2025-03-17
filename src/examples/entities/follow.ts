import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { User } from './user';
import { Table, Column, ForeignKey } from '../../sql/decorators';

/**
 * Follow entity representing user following relationships
 */
@Table({ name: 'follows' })
export class Follow extends BaseEntity {
  @Column({ name: 'follower_id' })
  @ForeignKey('users', 'id')
  followerId: string;

  @Column({ name: 'followed_id' })
  @ForeignKey('users', 'id')
  followedId: string;

  // References (not stored in database)
  follower?: User;
  followed?: User;
  
  constructor(data?: Partial<Follow>) {
    super(data);
    this.followerId = data?.followerId || '';
    this.followedId = data?.followedId || '';
    this.follower = data?.follower;
    this.followed = data?.followed;
  }
} 
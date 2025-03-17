import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { Column, ForeignKey } from '../../sql/decorators';

/**
 * Base entity class for entities that belong to a user.
 * Extends BaseEntity and adds userId field and user reference.
 */
export abstract class UserOwnedEntity extends BaseEntity {
  @Column({ name: "user_id" })
  @ForeignKey("users", "id")
  userId: string;
  
  // Reference to the user (not stored in database)
  user?: any; // Will be properly typed when circular references are resolved
  
  constructor(data?: Partial<UserOwnedEntity>) {
    super(data);
    this.userId = data?.userId || '';
    this.user = data?.user;
  }
} 
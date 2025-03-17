import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { Table, Column } from '../../sql/decorators';

/**
 * User entity representing a user in the micro-blogging platform
 */
@Table({ name: 'users' })
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column({ nullable: true, unique: true })
  email?: string;

  @Column({ name: 'email_verified', nullable: true })
  emailVerified?: Date;

  @Column({ nullable: true })
  password?: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ nullable: true, type: 'text' })
  bio?: string;

  @Column({ name: 'profile_image', nullable: true })
  profileImage?: string;
  
  constructor(data?: Partial<User>) {
    super(data);
    this.username = data?.username || '';
    this.email = data?.email;
    this.emailVerified = data?.emailVerified;
    this.password = data?.password;
    this.displayName = data?.displayName;
    this.bio = data?.bio;
    this.profileImage = data?.profileImage;
  }
} 
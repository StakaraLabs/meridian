import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { User } from './user';
import { Table, Column, ForeignKey } from '../../sql/decorators';

/**
 * UserSettings entity representing user preferences and settings
 */
@Table({ name: 'user_settings' })
export class UserSettings extends BaseEntity {
  @Column({ name: 'user_id', unique: true })
  @ForeignKey('users', 'id')
  userId: string;

  @Column({ name: 'notifications_enabled', default: () => 'true' })
  notificationsEnabled: boolean;

  @Column({ name: 'privacy_level', default: () => "'public'" })
  privacyLevel: 'public' | 'private' | 'friends';

  @Column({ default: () => "'light'" })
  theme: string;

  // Reference to the user (not stored in database)
  user?: User;
  
  constructor(data?: Partial<UserSettings>) {
    super(data);
    this.userId = data?.userId || '';
    this.notificationsEnabled = data?.notificationsEnabled ?? true;
    this.privacyLevel = data?.privacyLevel || 'public';
    this.theme = data?.theme || 'light';
    this.user = data?.user;
  }
} 
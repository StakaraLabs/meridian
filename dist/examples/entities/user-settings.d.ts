import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { User } from './user';
/**
 * UserSettings entity representing user preferences and settings
 */
export declare class UserSettings extends BaseEntity {
    userId: string;
    notificationsEnabled: boolean;
    privacyLevel: 'public' | 'private' | 'friends';
    theme: string;
    user?: User;
    constructor(data?: Partial<UserSettings>);
}

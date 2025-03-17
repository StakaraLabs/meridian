import 'reflect-metadata';
import { BaseEntity } from './base-entity';
/**
 * Tag entity representing a topic tag for posts
 */
export declare class Tag extends BaseEntity {
    name: string;
    constructor(data?: Partial<Tag>);
}

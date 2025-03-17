import 'reflect-metadata';
import { BaseEntity } from './base-entity';
import { Table, Column } from '../../sql/decorators';

/**
 * Tag entity representing a topic tag for posts
 */
@Table({ name: 'tags' })
export class Tag extends BaseEntity {
  @Column({ unique: true })
  name: string;
  
  constructor(data?: Partial<Tag>) {
    super(data);
    this.name = data?.name || '';
  }
} 
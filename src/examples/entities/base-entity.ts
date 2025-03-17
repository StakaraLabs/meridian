import 'reflect-metadata';
import { Column } from '../../sql/decorators';

/**
 * Base entity class that all domain entities should extend.
 * Provides common fields like id, createdAt, updatedAt, and deletedAt.
 */
export abstract class BaseEntity {
  @Column({ primary: true, default: () => "gen_random_uuid()" })
  id: string;

  @Column({ name: "created_at", default: () => "NOW()" })
  createdAt: Date;

  @Column({ name: "updated_at", default: () => "NOW()" })
  updatedAt: Date;

  @Column({ name: "deleted_at", nullable: true })
  deletedAt?: Date;
  
  constructor(data?: Partial<BaseEntity>) {
    this.id = data?.id || '';
    this.createdAt = data?.createdAt || new Date();
    this.updatedAt = data?.updatedAt || new Date();
    this.deletedAt = data?.deletedAt;
  }
} 
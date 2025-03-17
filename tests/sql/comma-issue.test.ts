import 'reflect-metadata';
import { Table, Column, ForeignKey } from '../../../lib/sql/decorators';
import { generateTableSQL } from '../../../lib/sql/migration';

// Create a real entity class with decorators for testing
@Table({ name: 'test_entity' })
class TestEntity {
  @Column({ primary: true, default: () => "gen_random_uuid()" })
  id: string = '';

  @Column({ nullable: true })
  name?: string;
  
  @Column({ name: 'user_id', nullable: false })
  @ForeignKey('users', 'id')
  userId: string = '';
}

describe('SQL Generation Comma Issue', () => {
  it('should not have an extra comma before foreign key constraints', () => {
    const sql = generateTableSQL(TestEntity);
    
    // The SQL should not contain ',,' (double comma)
    expect(sql).not.toContain(',,');
    
    // The SQL should not contain ',\n,' (comma, newline, comma)
    expect(sql).not.toMatch(/,\s*,/);
    
    // Check the specific pattern we're concerned about
    expect(sql).not.toMatch(/,\s*\n\s*,/);
    
    // The SQL should be valid
    expect(sql).toContain('CREATE TABLE test_entity');
    expect(sql).toContain('id text NOT NULL DEFAULT gen_random_uuid()');
    expect(sql).toContain('PRIMARY KEY (id)');
    expect(sql).toContain('name text');
    expect(sql).toContain('user_id text NOT NULL');
    expect(sql).toContain('CONSTRAINT fk_test_entity_user_id FOREIGN KEY (user_id) REFERENCES users(id)');
  });
  
  it('should handle multiple foreign keys correctly', () => {
    // Create a class with multiple foreign keys
    @Table({ name: 'multi_fk_entity' })
    class MultiFkEntity {
      @Column({ primary: true, default: () => "gen_random_uuid()" })
      id: string = '';
      
      @Column({ name: 'user_id', nullable: false })
      @ForeignKey('users', 'id')
      userId: string = '';
      
      @Column({ name: 'post_id', nullable: false })
      @ForeignKey('posts', 'id')
      postId: string = '';
    }
    
    const sql = generateTableSQL(MultiFkEntity);
    
    // The SQL should not contain ',,' (double comma)
    expect(sql).not.toContain(',,');
    
    // The SQL should not contain ',\n,' (comma, newline, comma)
    expect(sql).not.toMatch(/,\s*,/);
    
    // Check the specific pattern we're concerned about
    expect(sql).not.toMatch(/,\s*\n\s*,/);
    
    // The SQL should be valid
    expect(sql).toContain('CREATE TABLE multi_fk_entity');
    expect(sql).toContain('id text NOT NULL DEFAULT gen_random_uuid()');
    expect(sql).toContain('PRIMARY KEY (id)');
    expect(sql).toContain('user_id text NOT NULL');
    expect(sql).toContain('post_id text NOT NULL');
    expect(sql).toContain('CONSTRAINT fk_multi_fk_entity_user_id FOREIGN KEY (user_id) REFERENCES users(id)');
    expect(sql).toContain('CONSTRAINT fk_multi_fk_entity_post_id FOREIGN KEY (post_id) REFERENCES posts(id)');
  });
  
  it('should handle entities with no foreign keys correctly', () => {
    // Create a class with no foreign keys
    @Table({ name: 'no_fk_entity' })
    class NoFkEntity {
      @Column({ primary: true, default: () => "gen_random_uuid()" })
      id: string = '';
      
      @Column({ nullable: true })
      name?: string;
    }
    
    const sql = generateTableSQL(NoFkEntity);
    
    // The SQL should not contain ',,' (double comma)
    expect(sql).not.toContain(',,');
    
    // The SQL should not contain ',\n,' (comma, newline, comma)
    expect(sql).not.toMatch(/,\s*,/);
    
    // Check the specific pattern we're concerned about
    expect(sql).not.toMatch(/,\s*\n\s*,/);
    
    // The SQL should be valid
    expect(sql).toContain('CREATE TABLE no_fk_entity');
    expect(sql).toContain('id text NOT NULL DEFAULT gen_random_uuid()');
    expect(sql).toContain('PRIMARY KEY (id)');
    expect(sql).toContain('name text');
  });
}); 
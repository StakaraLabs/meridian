import 'reflect-metadata';
import { Table, Column, ForeignKey, VectorColumn } from '../../../lib/sql/decorators';
import { quoteIdentifier, escapeSqlString, isSqlFunction, generateTableSQL } from '../../../lib/sql/migration';

// Create real entity classes with decorators for testing
@Table({ name: 'users' })
class User {
  @Column({ primary: true, default: () => "gen_random_uuid()" })
  id: string = '';

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: false, unique: true })
  email: string = '';
  
  constructor(data?: Partial<User>) {
    if (data) {
      this.id = data.id || '';
      this.name = data.name;
      this.email = data.email || '';
    }
  }
}

@Table({ name: 'posts' })
class Post {
  @Column({ primary: true, default: () => "gen_random_uuid()" })
  id: string = '';

  @Column({ nullable: false })
  title: string = '';

  @Column({ nullable: true })
  content?: string;

  @Column({ name: 'user_id', nullable: false })
  @ForeignKey('users', 'id')
  userId: string = '';
  
  constructor(data?: Partial<Post>) {
    if (data) {
      this.id = data.id || '';
      this.title = data.title || '';
      this.content = data.content;
      this.userId = data.userId || '';
    }
  }
}

@Table({ name: 'embeddings' })
class Embedding {
  @Column({ primary: true, default: () => "gen_random_uuid()" })
  id: string = '';

  @Column({ nullable: false })
  text: string = '';

  @VectorColumn(1536)
  embedding: number[] = [];
  
  constructor(data?: Partial<Embedding>) {
    if (data) {
      this.id = data.id || '';
      this.text = data.text || '';
      this.embedding = data.embedding || [];
    }
  }
}

describe('Table Generation', () => {
  describe('generateTableSQL', () => {
    it('should generate SQL for a simple table', () => {
      const sql = generateTableSQL(User);
      
      expect(sql).toContain('CREATE TABLE users');
      expect(sql).toContain('id text NOT NULL DEFAULT gen_random_uuid()');
      expect(sql).toContain('PRIMARY KEY (id)');
      expect(sql).toContain('name text');
      expect(sql).toContain('email text NOT NULL UNIQUE');
    });
    
    it('should generate SQL with foreign keys', () => {
      const sql = generateTableSQL(Post);
      
      expect(sql).toContain('CREATE TABLE posts');
      expect(sql).toContain('id text NOT NULL DEFAULT gen_random_uuid()');
      expect(sql).toContain('PRIMARY KEY (id)');
      expect(sql).toContain('title text NOT NULL');
      expect(sql).toContain('content text');
      expect(sql).toContain('user_id text NOT NULL');
      expect(sql).toContain('CONSTRAINT fk_posts_user_id FOREIGN KEY (user_id) REFERENCES users(id)');
    });
    
    it('should generate SQL with vector columns', () => {
      const sql = generateTableSQL(Embedding);
      
      expect(sql).toContain('CREATE TABLE embeddings');
      expect(sql).toContain('id text NOT NULL DEFAULT gen_random_uuid()');
      expect(sql).toContain('PRIMARY KEY (id)');
      expect(sql).toContain('text text NOT NULL');
      expect(sql).toContain('embedding vector(1536)');
    });
    
    it('should handle default values correctly', () => {
      @Table({ name: 'test_defaults' })
      class TestDefaults {
        @Column({ primary: true, default: () => "gen_random_uuid()" })
        id: string = '';
        
        @Column({ default: () => "NOW()" })
        timestamp: Date = new Date();
        
        @Column({ default: () => "'default text'" })
        text: string = '';
        
        @Column({ default: () => "true" })
        active: boolean = true;
        
        @Column({ type: 'jsonb', default: () => "[]" })
        tags: string[] = [];
      }
      
      const sql = generateTableSQL(TestDefaults);
      
      expect(sql).toContain('CREATE TABLE test_defaults');
      expect(sql).toContain('id text NOT NULL DEFAULT gen_random_uuid()');
      expect(sql).toContain('PRIMARY KEY (id)');
      expect(sql).toContain('timestamp timestamp with time zone NOT NULL DEFAULT NOW()');
      expect(sql).toContain("text text NOT NULL DEFAULT '''default text'''");
      expect(sql).toContain("active boolean NOT NULL DEFAULT 'true'");
      expect(sql).toContain("tags jsonb NOT NULL DEFAULT '[]'");
    });
    
    it('should handle nullable columns correctly', () => {
      @Table({ name: 'test_nullable' })
      class TestNullable {
        @Column({ primary: true })
        id: string = '';
        
        @Column({ nullable: true })
        optional?: string;
        
        @Column({ nullable: false })
        required: string = '';
      }
      
      const sql = generateTableSQL(TestNullable);
      
      expect(sql).toContain('CREATE TABLE test_nullable');
      expect(sql).toContain('id text NOT NULL');
      expect(sql).toContain('PRIMARY KEY (id)');
      expect(sql).toContain('optional text');
      expect(sql).toContain('required text NOT NULL');
    });
  });
  
  describe('quoteIdentifier', () => {
    it('should quote identifiers correctly', () => {
      expect(quoteIdentifier('users')).toBe('users');
      expect(quoteIdentifier('user_id')).toBe('user_id');
      expect(quoteIdentifier('table')).toBe('"table"'); // Reserved keyword
      expect(quoteIdentifier('select')).toBe('"select"'); // Reserved keyword
    });
  });
  
  describe('escapeSqlString', () => {
    it('should escape single quotes in strings', () => {
      expect(escapeSqlString("user's data")).toBe("'user''s data'");
      expect(escapeSqlString("O'Reilly")).toBe("'O''Reilly'");
      expect(escapeSqlString("It's a \"quoted\" string")).toBe("'It''s a \"quoted\" string'");
    });
  });
  
  describe('isSqlFunction', () => {
    it('should identify SQL functions correctly', () => {
      expect(isSqlFunction('NOW()')).toBe(true);
      expect(isSqlFunction('gen_random_uuid()')).toBe(true);
      expect(isSqlFunction('CURRENT_TIMESTAMP')).toBe(false);
      expect(isSqlFunction('not a function')).toBe(false);
      expect(isSqlFunction('123')).toBe(false);
      expect(isSqlFunction(null)).toBe(false);
      expect(isSqlFunction(undefined)).toBe(false);
    });
  });
}); 
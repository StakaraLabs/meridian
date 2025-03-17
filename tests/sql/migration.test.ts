import 'reflect-metadata';
import { 
  quoteIdentifier, 
  escapeSqlString, 
  isSqlFunction,
  generateMigrationSQL,
  generateTableSQL,
  generateAlterTableSQL
} from '../../../lib/sql/migration';
import { Table, Column, ForeignKey, VectorColumn } from '../../../lib/sql/decorators';

// Create real entity classes with decorators for testing
@Table({ name: 'users' })
class User {
  @Column({ primary: true, default: () => "gen_random_uuid()" })
  id: string = '';

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: false, unique: true })
  email: string = '';
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
}

@Table({ name: 'embeddings' })
class Embedding {
  @Column({ primary: true, default: () => "gen_random_uuid()" })
  id: string = '';

  @Column({ nullable: false })
  text: string = '';

  @VectorColumn(1536)
  embedding: number[] = [];
}

// Create a more complex dependency graph for testing
@Table({ name: 'comments' })
class Comment {
  @Column({ primary: true, default: () => "gen_random_uuid()" })
  id: string = '';

  @Column({ nullable: false })
  content: string = '';

  @Column({ name: 'post_id', nullable: false })
  @ForeignKey('posts', 'id')
  postId: string = '';

  @Column({ name: 'user_id', nullable: false })
  @ForeignKey('users', 'id')
  userId: string = '';
}

@Table({ name: 'likes' })
class Like {
  @Column({ primary: true, default: () => "gen_random_uuid()" })
  id: string = '';

  @Column({ name: 'comment_id', nullable: false })
  @ForeignKey('comments', 'id')
  commentId: string = '';

  @Column({ name: 'user_id', nullable: false })
  @ForeignKey('users', 'id')
  userId: string = '';
}

// Helper function to create a table info object for testing
function createTableInfo(columns: any[], primaryKey: string[] = [], foreignKeys: any[] = [], indexes: any[] = []): any {
  return {
    columns,
    primaryKey,
    foreignKeys,
    indexes
  };
}

describe('Migration Utilities', () => {
  describe('quoteIdentifier', () => {
    it('should quote reserved keywords', () => {
      expect(quoteIdentifier('user')).toBe('"user"');
      expect(quoteIdentifier('order')).toBe('"order"');
      expect(quoteIdentifier('table')).toBe('"table"');
    });

    it('should quote identifiers with special characters', () => {
      expect(quoteIdentifier('my-table')).toBe('"my-table"');
      expect(quoteIdentifier('my.table')).toBe('"my.table"');
      expect(quoteIdentifier('my table')).toBe('"my table"');
    });

    it('should not quote regular identifiers', () => {
      expect(quoteIdentifier('users')).toBe('users');
      expect(quoteIdentifier('posts')).toBe('posts');
      expect(quoteIdentifier('my_table')).toBe('my_table');
    });
  });

  describe('escapeSqlString', () => {
    it('should escape single quotes', () => {
      expect(escapeSqlString("O'Reilly")).toBe("'O''Reilly'");
      expect(escapeSqlString("It's a test")).toBe("'It''s a test'");
    });

    it('should wrap strings in single quotes', () => {
      expect(escapeSqlString('test')).toBe("'test'");
      expect(escapeSqlString('')).toBe("''");
    });
  });

  describe('isSqlFunction', () => {
    it('should identify SQL function calls', () => {
      expect(isSqlFunction('NOW()')).toBe(true);
      expect(isSqlFunction('gen_random_uuid()')).toBe(true);
      expect(isSqlFunction('CURRENT_TIMESTAMP')).toBe(false);
      expect(isSqlFunction('test')).toBe(false);
      expect(isSqlFunction('')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(isSqlFunction(123)).toBe(false);
      expect(isSqlFunction(null)).toBe(false);
      expect(isSqlFunction(undefined)).toBe(false);
      expect(isSqlFunction({})).toBe(false);
    });
  });

  describe('generateTableSQL', () => {
    it('should generate SQL for creating a table with columns and constraints', () => {
      const sql = generateTableSQL(User);
      
      expect(sql).toContain('CREATE TABLE users');
      expect(sql).toContain('id text');
      expect(sql).toContain('NOT NULL');
      expect(sql).toContain('DEFAULT gen_random_uuid()');
      expect(sql).toContain('PRIMARY KEY');
      expect(sql).toContain('email text NOT NULL UNIQUE');
    });

    it('should generate SQL for creating a table with foreign keys', () => {
      const sql = generateTableSQL(Post);
      
      expect(sql).toContain('CREATE TABLE posts');
      expect(sql).toContain('CONSTRAINT fk_posts_user_id FOREIGN KEY (user_id) REFERENCES users(id)');
    });

    it('should generate SQL for creating a table with vector columns', () => {
      const sql = generateTableSQL(Embedding);
      
      expect(sql).toContain('CREATE TABLE embeddings');
      expect(sql).toContain('ALTER TABLE embeddings ADD COLUMN embedding vector(1536)');
    });
  });

  describe('generateMigrationSQL', () => {
    it('should generate SQL for creating tables in the correct order', () => {
      const entityClasses = [Post, User];
      const currentSchema = {};
      
      const sql = generateMigrationSQL(entityClasses, currentSchema);
      
      // User should be created before Post due to foreign key dependency
      const userIndex = sql.indexOf('CREATE TABLE users');
      const postIndex = sql.indexOf('CREATE TABLE posts');
      
      expect(userIndex).toBeGreaterThan(0);
      expect(postIndex).toBeGreaterThan(0);
      expect(userIndex).toBeLessThan(postIndex);
    });

    it('should handle complex dependency graphs', () => {
      const entityClasses = [Like, Comment, Post, User];
      const currentSchema = {};
      
      const sql = generateMigrationSQL(entityClasses, currentSchema);
      
      // Check the order of table creation
      const userIndex = sql.indexOf('CREATE TABLE users');
      const postIndex = sql.indexOf('CREATE TABLE posts');
      const commentIndex = sql.indexOf('CREATE TABLE comments');
      const likeIndex = sql.indexOf('CREATE TABLE likes');
      
      expect(userIndex).toBeGreaterThan(0);
      expect(postIndex).toBeGreaterThan(0);
      expect(commentIndex).toBeGreaterThan(0);
      expect(likeIndex).toBeGreaterThan(0);
      
      // User should be created first, then Post, then Comment, then Like
      expect(userIndex).toBeLessThan(postIndex);
      expect(postIndex).toBeLessThan(commentIndex);
      expect(commentIndex).toBeLessThan(likeIndex);
    });

    it('should generate SQL for altering existing tables', () => {
      const entityClasses = [User, Post];
      const currentSchema = {
        users: createTableInfo([
          { column_name: 'id', data_type: 'text', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
          { column_name: 'email', data_type: 'text', is_nullable: 'NO', column_default: null }
        ], ['id']),
        posts: createTableInfo([
          { column_name: 'id', data_type: 'text', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
          { column_name: 'title', data_type: 'text', is_nullable: 'NO', column_default: null }
        ], ['id'])
      };
      
      const sql = generateMigrationSQL(entityClasses, currentSchema);
      
      // Should add missing columns and constraints
      expect(sql).toContain('ALTER TABLE users ADD COLUMN name text');
      expect(sql).toContain('ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)');
      expect(sql).toContain('ALTER TABLE posts ADD COLUMN content text');
      expect(sql).toContain('ALTER TABLE posts ADD COLUMN user_id text NOT NULL');
      expect(sql).toContain('ALTER TABLE posts ADD CONSTRAINT fk_posts_user_id FOREIGN KEY (user_id) REFERENCES users(id)');
    });

    it('should handle circular dependencies with deferred constraints', () => {
      // Create classes with circular dependencies
      @Table({ name: 'parent' })
      class Parent {
        @Column({ primary: true, default: () => "gen_random_uuid()" })
        id: string = '';
        
        @Column({ name: 'child_id', nullable: true })
        @ForeignKey('child', 'id')
        childId?: string;
      }
      
      @Table({ name: 'child' })
      class Child {
        @Column({ primary: true, default: () => "gen_random_uuid()" })
        id: string = '';
        
        @Column({ name: 'parent_id', nullable: false })
        @ForeignKey('parent', 'id')
        parentId: string = '';
      }
      
      const entityClasses = [Parent, Child];
      const currentSchema = {};
      
      const sql = generateMigrationSQL(entityClasses, currentSchema);
      
      // Should handle circular dependencies with deferred constraints
      expect(sql).toContain('-- Handling circular dependencies');
      expect(sql).toContain('DEFERRABLE INITIALLY DEFERRED');
    });
  });

  describe('generateAlterTableSQL', () => {
    it('should generate SQL for adding missing columns', () => {
      const existingTable = createTableInfo([
        { column_name: 'id', data_type: 'text', is_nullable: 'NO', column_default: 'gen_random_uuid()' }
      ], ['id']);
      
      const sql = generateAlterTableSQL(User, existingTable);
      
      expect(sql).toContain('ALTER TABLE users ADD COLUMN name text');
      expect(sql).toContain('ALTER TABLE users ADD COLUMN email text NOT NULL UNIQUE');
    });

    it('should generate SQL for modifying column nullability', () => {
      const existingTable = createTableInfo([
        { column_name: 'id', data_type: 'text', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
        { column_name: 'name', data_type: 'text', is_nullable: 'NO', column_default: null },
        { column_name: 'email', data_type: 'text', is_nullable: 'YES', column_default: null }
      ], ['id']);
      
      const sql = generateAlterTableSQL(User, existingTable);
      
      expect(sql).toContain('ALTER TABLE users ALTER COLUMN name DROP NOT NULL');
      expect(sql).toContain('ALTER TABLE users ALTER COLUMN email SET NOT NULL');
    });

    it('should generate SQL for adding unique constraints', () => {
      const existingTable = createTableInfo([
        { column_name: 'id', data_type: 'text', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
        { column_name: 'name', data_type: 'text', is_nullable: 'YES', column_default: null },
        { column_name: 'email', data_type: 'text', is_nullable: 'NO', column_default: null }
      ], ['id']);
      
      const sql = generateAlterTableSQL(User, existingTable);
      
      expect(sql).toContain('ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)');
    });

    it('should generate SQL for adding foreign keys', () => {
      const existingTable = createTableInfo([
        { column_name: 'id', data_type: 'text', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
        { column_name: 'title', data_type: 'text', is_nullable: 'NO', column_default: null },
        { column_name: 'content', data_type: 'text', is_nullable: 'YES', column_default: null },
        { column_name: 'user_id', data_type: 'text', is_nullable: 'NO', column_default: null }
      ], ['id']);
      
      const sql = generateAlterTableSQL(Post, existingTable);
      
      expect(sql).toContain('ALTER TABLE posts ADD CONSTRAINT fk_posts_user_id FOREIGN KEY (user_id) REFERENCES users(id)');
    });

    it('should generate SQL for adding vector columns', () => {
      const existingTable = createTableInfo([
        { column_name: 'id', data_type: 'text', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
        { column_name: 'text', data_type: 'text', is_nullable: 'NO', column_default: null }
      ], ['id']);
      
      const sql = generateAlterTableSQL(Embedding, existingTable);
      
      expect(sql).toContain('ALTER TABLE embeddings ADD COLUMN embedding vector(1536)');
    });
  });
}); 
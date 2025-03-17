# Contributing to Meridian

Thank you for considering contributing to Meridian! This document outlines the process and guidelines for contributing to the project.

## Development Philosophy

Meridian follows these core principles:

1. **Functional Programming**: We prefer pure functions, immutability, and composition over inheritance and side effects.
2. **Small and Composable**: Build small, focused functions that do one thing well.
3. **Type Safety**: All code should be properly typed with TypeScript.
4. **Test-Driven**: Write tests before or alongside your code.
5. **Documentation First**: Document your code as you write it.

## Getting Started

### Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/meridian.git`
3. Install dependencies: `npm install`
4. Set up a PostgreSQL database for testing
5. Create a `.env` file with your database connection details:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=meridian_test
   DB_USER=postgres
   DB_PASSWORD=password
   ```
6. Run tests: `npm test`

### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Write tests for your changes
4. Ensure all tests pass: `npm test`
5. Update documentation if necessary
6. Commit your changes following our commit message conventions
7. Push to your fork: `git push origin feature/your-feature-name`
8. Submit a pull request

## Code Style

We use ESLint and Prettier to enforce code style. Before committing, run:

```bash
npm run lint
npm run format
```

### Naming Conventions

- **Functions**: Use camelCase for function names (e.g., `findById`)
- **Files**: Match the export name (e.g., `connection.ts` for connection functions)
- **Constants**: Use UPPER_SNAKE_CASE for constants (e.g., `DEFAULT_POOL_SIZE`)
- **SQL Keywords**: Use UPPERCASE in SQL strings (e.g., `SELECT * FROM users`)

### Function Guidelines

- Functions should be pure whenever possible
- Avoid side effects
- Use descriptive names that indicate what the function does
- Keep functions small and focused on a single responsibility
- Use TypeScript for type safety

Example:

```typescript
// Good
function findById<T>(db: Database, table: string, id: number): Promise<T | null> {
  return db.query<T>('SELECT * FROM $1 WHERE id = $2', [table, id])
    .then(results => results[0] || null);
}

// Avoid
function find(db, table, id) {
  console.log(`Finding record in ${table}`); // Side effect
  return db.query(`SELECT * FROM ${table} WHERE id = ${id}`); // SQL injection risk
}
```

## Testing

All code should be thoroughly tested. We use Jest for testing.

- **Unit Tests**: Test individual functions
- **Integration Tests**: Test with actual PostgreSQL database

For integration tests, we use a test database. Make sure your tests clean up after themselves.

Run tests with:

```bash
npm test
```

## Database Testing

For database tests:

1. Create a separate test database
2. Use the `beforeAll` and `afterAll` hooks to set up and tear down test data
3. Use transactions to isolate tests and automatically roll back changes

Example:

```typescript
describe('User operations', () => {
  let db;
  
  beforeAll(async () => {
    db = await connect({
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    
    // Create test tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      )
    `);
  });
  
  afterAll(async () => {
    // Clean up test tables
    await db.query('DROP TABLE IF EXISTS users');
    await db.end();
  });
  
  beforeEach(async () => {
    // Start transaction
    await db.query('BEGIN');
  });
  
  afterEach(async () => {
    // Roll back transaction
    await db.query('ROLLBACK');
  });
  
  test('should insert a user', async () => {
    const user = await insert(db, 'users', {
      name: 'Test User',
      email: 'test@example.com'
    });
    
    expect(user.id).toBeDefined();
    expect(user.name).toBe('Test User');
  });
});
```

## Documentation

All public APIs must be documented with JSDoc comments. Functions should include:

- Description of what the function does
- Parameters with types and descriptions
- Return values
- Examples of usage

Example:

```typescript
/**
 * Finds records in a table that match the given criteria
 * 
 * @param db - Database connection
 * @param table - Table name
 * @param where - Object with field/value pairs for the WHERE clause
 * @param options - Additional options like limit, offset, orderBy
 * @returns Promise resolving to an array of records
 * 
 * @example
 * ```ts
 * const users = await findWhere(db, 'users', { active: true }, { limit: 10 });
 * ```
 */
function findWhere<T>(
  db: Database, 
  table: string, 
  where: Record<string, any>, 
  options?: FindOptions
): Promise<T[]> {
  // Implementation
}
```

## Pull Request Process

1. Update the README.md or documentation with details of changes if appropriate
2. Update the CHANGELOG.md following semantic versioning
3. The PR must pass all automated tests
4. The PR requires approval from at least one maintainer
5. Once approved, a maintainer will merge your PR

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

Example:
```
feat(select): add support for advanced filtering

Add the ability to use complex WHERE conditions with operators.

Closes #123
```

## License

By contributing to Meridian, you agree that your contributions will be licensed under the project's MIT License. 
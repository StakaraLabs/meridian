#!/usr/bin/env node

// Register ts-node to handle TypeScript files
try {
  require('ts-node').register({
    project: 'tsconfig.node.json',
    transpileOnly: true,
    compilerOptions: {
      module: 'CommonJS',
    },
  });
} catch (e) {
  console.log('ts-node not available, assuming TypeScript is already compiled');
}

// Import reflect-metadata for decorators
import 'reflect-metadata';

// Import the SQL system
import {
  findBy,
  listAll,
  save,
  deleteBy,
  query,
  withTransaction,
  storeEmbedding,
  findSimilarEntries,
  runMigration,
  pool,
  EntityBase,
} from './index';

// Define test classes
class User implements EntityBase {
  id: string = '';
  name: string = '';
  email: string = '';
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  deletedAt?: Date;
}

class Entry implements EntityBase {
  id: string = '';
  userId: string = '';
  title: string = '';
  summary: string = '';
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  deletedAt?: Date;
}

async function testSqlSystem() {
  console.log('Running SQL system test...');

  try {
    // Run migration first to ensure tables exist
    console.log('Running migration...');
    await runMigration();

    // Test transaction
    console.log('\nTesting transaction...');
    const user = await withTransaction(async client => {
      // Create a test user
      const testUser = new User();
      testUser.name = 'Test User';
      testUser.email = `test-${Date.now()}@example.com`;

      console.log('Creating test user...');
      const savedUser = await save(testUser, client);
      console.log(`Created user with ID: ${savedUser.id}`);

      // Create a test entry
      const testEntry = new Entry();
      testEntry.userId = savedUser.id;
      testEntry.title = 'Test Entry';
      testEntry.summary = 'This is a test entry created by the SQL system test script.';

      console.log('Creating test entry...');
      const savedEntry = await save(testEntry, client);
      console.log(`Created entry with ID: ${savedEntry.id}`);

      // Test vector embedding
      console.log('Testing vector embedding...');
      
      // Create a proper sized embedding for testing (1536 dimensions)
      const testEmbeddingForStorage = Array(1536)
        .fill(0)
        .map(() => (Math.random() * 2 - 1) / Math.sqrt(1536));

      try {
        // Verify the entry exists in the database before storing the embedding
        const entryExists = await query(
          'SELECT id FROM entry WHERE id = :id',
          { id: savedEntry.id },
          client
        );

        if (entryExists.length === 0) {
          console.log(
            `Warning: Entry with ID ${savedEntry.id} not found in database. This may cause the embedding storage to fail.`
          );
        } else {
          console.log(
            `Verified entry with ID ${savedEntry.id} exists in database.`
          );
        }

        // Pass the client to storeEmbedding to use the same transaction
        const embeddingStored = await storeEmbedding(
          savedEntry.id,
          testEmbeddingForStorage,
          client
        );
        console.log(
          `Embedding stored: ${
            embeddingStored
              ? `ID: ${embeddingStored.id} for entry: ${embeddingStored.entryId}`
              : 'Failed'
          }`
        );

        // Find similar entries - also pass the client
        console.log('Finding similar entries...');
        const similarEntries = await findSimilarEntries(
          testEmbeddingForStorage,
          5,
          0.5,
          client
        );
        console.log(`Found ${similarEntries.length} similar entries`);
      } catch (error) {
        console.error('Error in embedding operations:', error);
      }

      // Return the user for further testing
      return savedUser;
    });

    // Test query outside transaction
    console.log('\nTesting raw query...');
    const entries = await query('SELECT * FROM entry WHERE user_id = :userId', {
      userId: user.id,
    });
    console.log(`Found ${entries.length} entries for user ${user.id}`);

    // Test listing entities
    console.log('\nTesting listAll...');
    const userEntries = await listAll(Entry, { userId: user.id });
    console.log(
      `Found ${userEntries.length} entries for user ${user.id} using listAll`
    );

    // Test finding entity
    console.log('\nTesting findBy...');
    const foundUser = await findBy(User, { id: user.id });
    console.log(`Found user: ${foundUser?.name} (${foundUser?.email})`);

    console.log('\nSQL system test completed successfully!');

    // Close the pool and exit
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error testing SQL system:', error);

    // Close the pool and exit
    try {
      await pool.end();
    } catch (e) {
      console.error('Error closing pool:', e);
    }

    process.exit(1);
  }
}

// Run the test
testSqlSystem().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

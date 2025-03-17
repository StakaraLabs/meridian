#!/usr/bin/env node

/**
 * Test script for the meridian-migrate CLI tool
 * This script tests the CLI tool with different options
 */

const { execSync } = require('child_process');
const path = require('path');

// Path to the CLI script
const cliPath = path.resolve(__dirname, '../dist/cli/migrate.js');

// Function to run a command and log the output
function runCommand(command) {
  console.log(`\n> ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return true;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    return false;
  }
}

// Main function
async function main() {
  console.log('Testing meridian-migrate CLI tool...');
  
  // Test help command
  runCommand(`node ${cliPath} --help`);
  
  // Test dry run
  runCommand(`node ${cliPath} --dry-run`);
  
  // Test verbose mode
  runCommand(`node ${cliPath} --verbose --dry-run`);
  
  // Test with custom entities directory (this should fail if the directory doesn't exist)
  runCommand(`node ${cliPath} --entities-dir test/entities --dry-run`);
  
  console.log('\nTests completed');
}

// Run the main function
main().catch(console.error); 
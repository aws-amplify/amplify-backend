#!/usr/bin/env node

import * as childProcess from 'child_process';

/*
 * This retry script is intentionally written in pure JavaScript and
 * uses no dependencies other than node built-ins.
 * This is to make sure that script can be run without requiring
 * 'npm install'.
 *
 * Usage:
 * ./scripts/retry.js <command>
 * ./scripts.retry.js --maxAttempts <number> <command>
 */

const usage =
  'Usage:\n./scripts/retry.js <command>\n./scripts.retry.js --maxAttempts <number> <command>';

class RetryOptions {
  constructor(maxAttempts, command) {
    this.maxAttempts = maxAttempts;
    this.command = command;
  }
}

const parseInput = () => {
  if (process.argv.length < 3) {
    console.log(usage);
    process.exit(1);
  }
  let commandStart = 2;
  let maxAttempts = 2;
  if (process.argv[commandStart] === '--maxAttempts') {
    maxAttempts = parseInt(process.argv[commandStart + 1]);
    if (!maxAttempts > 0) {
      console.log(usage);
      process.exit(1);
    }
    commandStart += 2;
  }
  const command = process.argv.slice(commandStart).join(' ');
  return new RetryOptions(maxAttempts, command);
};

const retryOptions = parseInput();

for (
  let attemptNumber = 1;
  attemptNumber <= retryOptions.maxAttempts;
  attemptNumber++
) {
  try {
    console.log(
      `Attempting '${retryOptions.command}', attempt number ${attemptNumber}.`
    );
    childProcess.execSync(retryOptions.command, {
      stdio: 'inherit',
    });
    console.log(
      `'${retryOptions.command}' was successful at attempt number ${attemptNumber}.`
    );
    process.exit(0);
  } catch (error) {
    console.log(
      `'${retryOptions.command}' was not successful at attempt number ${attemptNumber}.`
    );
    console.log(error);
  }
}

process.exit(1);

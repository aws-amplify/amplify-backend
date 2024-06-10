import { Argv } from 'yargs';
import assert from 'assert';
import { CommandMiddleware } from './command_middleware.js';
import { describe, it, mock } from 'node:test';
import { parseAsyncSafe } from './parse_async_safe.js';
import { printer } from '@aws-amplify/cli-core';

const commandMiddleware = new CommandMiddleware(printer);
const mockHandleProfile = mock.method(
  commandMiddleware,
  'ensureAwsCredentialAndRegion',
  () => null
);

const mockParser: Argv = {
  parseAsync: () => {
    throw new Error('Mock parser error');
  },
} as unknown as Argv;

void describe('execute parseAsyncSafe', () => {
  void it('parseAsyncSafe should not throw an error even if CommandMiddleware throws an error', async () => {
    const profileErr = new Error('some profile error');
    mockHandleProfile.mock.mockImplementationOnce(() => {
      throw profileErr;
    });
    try {
      await parseAsyncSafe(mockParser);
      assert.ok(true, 'parseAsyncSafe did not throw an error');
    } catch (err) {
      assert.fail('parseAsyncSafe threw an error');
    }
  });
});

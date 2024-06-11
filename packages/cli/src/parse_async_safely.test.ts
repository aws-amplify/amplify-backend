import { Argv } from 'yargs';
import assert from 'assert';
import { describe, it } from 'node:test';
import { parseAsyncSafely } from './parse_async_safely.js';

const mockParser: Argv = {
  parseAsync: () => {
    throw new Error('Mock parser error');
  },
} as unknown as Argv;

void describe('execute parseAsyncSafely', () => {
  void it('parseAsyncSafely should not throw an error', async () => {
    try {
      await parseAsyncSafely(mockParser);
      assert.ok(true, 'parseAsyncSafely did not throw an error');
    } catch (err) {
      assert.fail('parseAsyncSafely threw an error');
    }
  });
});

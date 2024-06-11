import { Argv } from 'yargs';
import { describe, it } from 'node:test';
import { parseAsyncSafely } from './parse_async_safely.js';

const mockParser: Argv = {
  parseAsync: () => {
    throw new Error('Mock parser error');
  },
} as unknown as Argv;

void describe('execute parseAsyncSafely', () => {
  void it('parseAsyncSafely should not throw an error', async () => {
    await parseAsyncSafely(mockParser);
    //not throw
  });
});

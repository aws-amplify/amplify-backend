import { doesNotThrow, throws } from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { secret } from './secret.js';

void describe('secret', () => {
  void afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).document;
  });

  void it('should throw in a browser context', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).document = {};

    throws(() => secret('test'), {
      message: 'Secrets are not supported in client-side applications',
    });
  });

  void it('should not throw in a node context', () => {
    doesNotThrow(() => secret('test'));
  });
});

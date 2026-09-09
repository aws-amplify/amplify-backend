import { equal } from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { isBrowser } from './is_browser.js';

void describe('is browser', () => {
  void afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).document;
  });

  void it('should be true in a browser context', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).document = {};

    equal(isBrowser(), true);
  });

  void it('should be false in a node context', () => {
    equal(isBrowser(), false);
  });
});

import { describe, it } from 'node:test';
import packageJson from '#package.json';
import assert from 'node:assert';

describe('plugin-types', () => {
  it('does not expose main entry point', () => {
    // this test ensures that this package cannot export functional code, only types
    assert.ok(!('main' in packageJson));
  });
});

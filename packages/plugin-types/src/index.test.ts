import { describe, it } from 'node:test';
import packageJson from '#package.json';
import assert from 'node:assert';

void describe('plugin-types', () => {
  void it('does not expose main entry point', () => {
    // this test ensures that this package cannot export functional code, only types
    assert.ok(!('main' in packageJson));
  });
});

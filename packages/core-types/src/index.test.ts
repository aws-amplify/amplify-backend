import { it } from 'node:test';
import packageJson from '../package.json';
import assert from 'node:assert';

/**
 * Check that this package does not expose a main function.
 * This ensures that the package can only expose types, not functional code
 */
it('only contains types', () => {
  assert.equal(packageJson.main === undefined, true);
});

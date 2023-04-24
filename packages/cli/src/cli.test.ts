import test, { describe } from 'node:test';
import assert from 'node:assert';
import { main } from './cli.js';

describe('dumb test', () => {
  // this test is just to sanity check that tests in multiple packages are running
  test('makes dumb assertion', () => {
    main();
    assert.equal(true, true);
  });
});

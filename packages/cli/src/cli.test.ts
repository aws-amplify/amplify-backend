import test, { describe } from 'node:test';
import assert from 'node:assert';

describe('dumb test', () => {
  // this test is just to sanity check that tests in multiple packages are running
  test('makes dumb assertion', () => {
    assert.equal(true, true);
  })
})

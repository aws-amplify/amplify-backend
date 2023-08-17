import { describe, it } from 'node:test';
import { getMainStackName } from './get_main_stack_name.js';
import assert from 'node:assert';
import { readFileSync } from 'fs';

/**
 * !!!CAUTION!!!
 *
 * You probably shouldn't be changing this naming scheme.
 * This represents the glue between how the backend main stack is created and later identified
 */
describe('getMainStackName', () => {
  it('returns stack name with expected convention', () => {
    const result = getMainStackName({
      backendId: 'testBackendId',
      branchName: 'testBranchName',
    });

    const expectedName = readFileSync(
      new URL(
        '../../../shared-test-assets/expected_main_stack_name.txt',
        import.meta.url
      ),
      'utf-8'
    ).trim();

    assert.equal(result, expectedName);
  });
});

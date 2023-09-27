import { describe, it } from 'node:test';
import { getMainStackName } from './get_main_stack_name.js';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { BranchBackendIdentifier } from '@aws-amplify/platform-core';

/**
 * !!!CAUTION!!!
 *
 * You probably shouldn't be changing this naming scheme.
 * This represents the glue between how the backend main stack is created and later identified
 */
void describe('getProjectEnvironmentMainStackSSMParameterKey', () => {
  void it('returns ssm key', () => {
    const result = getMainStackName(
      new BranchBackendIdentifier('testBackendId', 'testBranchName')
    );

    const expectedKey = readFileSync(
      new URL(
        '../../../shared-test-assets/expected_main_stack_name.txt',
        import.meta.url
      ),
      'utf-8'
    ).trim();

    assert.equal(result, expectedKey);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isRetainedE2eStack } from './e2e_stack_retention.js';

/* eslint-disable spellcheck/spell-checker */

void describe('isRetainedE2eStack', () => {
  void it('retains the persistent main branch hosting stack', () => {
    assert.strictEqual(
      isRetainedE2eStack('amplify-testapp-main-branch-1234abcd90'),
      true,
    );
  });

  void it('does not retain other branch stacks', () => {
    assert.strictEqual(
      isRetainedE2eStack('amplify-testapp-testbranch-branch-1234abcd90'),
      false,
    );
  });

  void it('does not retain sandbox stacks', () => {
    assert.strictEqual(
      isRetainedE2eStack('amplify-testapp-main-sandbox-1234abcd90'),
      false,
    );
  });

  void it('does not retain nested or unrelated stacks', () => {
    assert.strictEqual(
      isRetainedE2eStack('amplify-testapp-main-branch-1234abcd90-auth-XYZ'),
      false,
    );
    assert.strictEqual(isRetainedE2eStack('amplify-test-cdk-stack'), false);
    assert.strictEqual(isRetainedE2eStack(undefined), false);
  });
});

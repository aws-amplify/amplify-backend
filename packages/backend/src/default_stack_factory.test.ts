import { describe, it } from 'node:test';
import { createDefaultStack } from './default_stack_factory.js';
import { App } from 'aws-cdk-lib';
import assert from 'node:assert';
import { AmplifyStack } from './engine/amplify_stack.js';

describe('createDefaultRootStack', () => {
  it('creates AmplifyStack with backend ID and branch from CDK context', () => {
    const app = new App();
    app.node.setContext('backend-id', 'testBackendId');
    app.node.setContext('branch-name', 'testBranchName');
    const stack = createDefaultStack(app);
    assert.ok(stack instanceof AmplifyStack);
    assert.strictEqual(stack.stackName, 'amplify-testBackendId-testBranchName');
  });

  it('throws if backend-id is missing', () => {
    const app = new App();
    app.node.setContext('branch-name', 'testEnvName');
    assert.throws(() => createDefaultStack(app), {
      message: 'No context value present for backend-id key',
    });
  });

  it('throws if branch-name is missing', () => {
    const app = new App();
    app.node.setContext('backend-id', 'testBackendId');
    assert.throws(() => createDefaultStack(app), {
      message: 'No context value present for branch-name key',
    });
  });
});

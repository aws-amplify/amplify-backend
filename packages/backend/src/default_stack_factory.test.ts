import { describe, it } from 'node:test';
import { createDefaultStack } from './default_stack_factory.js';
import { App } from 'aws-cdk-lib';
import assert from 'node:assert';
import { AmplifyStack } from './engine/amplify_stack.js';

describe('createDefaultRootStack', () => {
  it('creates AmplifyStack with appId and branch CDK context', () => {
    const app = new App();
    app.node.setContext('app-id', 'testAppId');
    app.node.setContext('branch-name', 'testBranchName');
    const stack = createDefaultStack(app);
    assert.ok(stack instanceof AmplifyStack);
    assert.strictEqual(stack.stackName, 'amplify-testAppId-testBranchName');
  });

  it('throws if appId is missing', () => {
    const app = new App();
    app.node.setContext('branch-name', 'testEnvName');
    assert.throws(() => createDefaultStack(app), {
      message: 'No context value present for app-id key',
    });
  });

  it('throws if branch name is missing', () => {
    const app = new App();
    app.node.setContext('app-id', 'testAppId');
    assert.throws(() => createDefaultStack(app), {
      message: 'No context value present for branch-name key',
    });
  });
});

import { describe, it } from 'node:test';
import { createDefaultStack } from './default_stack_factory.js';
import { App } from 'aws-cdk-lib';
import assert from 'node:assert';
import { AmplifyStack } from './engine/amplify_stack.js';
import { BackendDeploymentType } from '@aws-amplify/platform-core';

void describe('createDefaultRootStack', () => {
  void it('creates AmplifyStack with backend ID and branch from CDK context', () => {
    const app = new App();
    app.node.setContext('backend-id', 'testBackendId');
    app.node.setContext('branch-name', 'testBranchName');
    app.node.setContext('deployment-type', BackendDeploymentType.BRANCH);
    const stack = createDefaultStack(app);
    assert.ok(stack instanceof AmplifyStack);
    assert.strictEqual(stack.stackName, 'amplify-testBackendId-testBranchName');
  });

  void it('throws if backend-id is missing', () => {
    const app = new App();
    app.node.setContext('branch-name', 'testEnvName');
    app.node.setContext('deployment-type', BackendDeploymentType.BRANCH);
    assert.throws(() => createDefaultStack(app), {
      message: 'No context value present for backend-id key',
    });
  });

  void it('throws if branch-name is missing', () => {
    const app = new App();
    app.node.setContext('backend-id', 'testBackendId');
    app.node.setContext('deployment-type', BackendDeploymentType.BRANCH);
    assert.throws(() => createDefaultStack(app), {
      message: 'No context value present for branch-name key',
    });
  });
});

import { describe, it } from 'node:test';
import { createDefaultStack } from './default_stack_factory.js';
import { App } from 'aws-cdk-lib';
import assert from 'node:assert';
import { AmplifyStack } from './engine/amplify_stack.js';
import {
  BackendDeploymentType,
  CDKContextKey,
} from '@aws-amplify/platform-core';

void describe('createDefaultRootStack', () => {
  void it('creates AmplifyStack with backend ID and branch from CDK context', () => {
    const app = new App();
    app.node.setContext(CDKContextKey.BACKEND_NAMESPACE, 'testBackendId');
    app.node.setContext(CDKContextKey.BACKEND_INSTANCE, 'testBranchName');
    app.node.setContext(
      CDKContextKey.DEPLOYMENT_TYPE,
      BackendDeploymentType.BRANCH
    );
    const stack = createDefaultStack(app);
    assert.ok(stack instanceof AmplifyStack);
    assert.strictEqual(
      stack.stackName,
      'amplify-testBackendId-testBranchName-branch'
    );
  });

  void it('creates sandbox AmplifyStack when deployment type is sandbox', () => {
    const app = new App();
    app.node.setContext(CDKContextKey.BACKEND_NAMESPACE, 'testProjectName');
    app.node.setContext(CDKContextKey.BACKEND_INSTANCE, 'testUser');
    app.node.setContext(
      CDKContextKey.DEPLOYMENT_TYPE,
      BackendDeploymentType.SANDBOX
    );
    const stack = createDefaultStack(app);
    assert.ok(stack instanceof AmplifyStack);
    assert.strictEqual(
      stack.stackName,
      'amplify-testProjectName-testUser-sandbox'
    );
  });

  void it(`throws if ${CDKContextKey.BACKEND_NAMESPACE} is missing`, () => {
    const app = new App();
    app.node.setContext(CDKContextKey.BACKEND_INSTANCE, 'testEnvName');
    app.node.setContext(
      CDKContextKey.DEPLOYMENT_TYPE,
      BackendDeploymentType.BRANCH
    );
    assert.throws(() => createDefaultStack(app), {
      message: `No context value present for ${CDKContextKey.BACKEND_NAMESPACE} key`,
    });
  });

  void it(`throws if ${CDKContextKey.BACKEND_INSTANCE} is missing`, () => {
    const app = new App();
    app.node.setContext(CDKContextKey.BACKEND_NAMESPACE, 'testBackendId');
    app.node.setContext(
      CDKContextKey.DEPLOYMENT_TYPE,
      BackendDeploymentType.BRANCH
    );
    assert.throws(() => createDefaultStack(app), {
      message: `No context value present for ${CDKContextKey.BACKEND_INSTANCE} key`,
    });
  });

  void it(`throws if ${CDKContextKey.DEPLOYMENT_TYPE} is missing`, () => {
    const app = new App();
    app.node.setContext(CDKContextKey.BACKEND_NAMESPACE, 'testBackendId');
    app.node.setContext(CDKContextKey.BACKEND_INSTANCE, 'testEnvName');
    assert.throws(() => createDefaultStack(app), {
      message: `No context value present for ${CDKContextKey.DEPLOYMENT_TYPE} key`,
    });
  });
});

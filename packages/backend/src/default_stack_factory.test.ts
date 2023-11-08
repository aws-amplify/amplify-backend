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
    app.node.setContext(CDKContextKey.BACKEND_DISAMBIGUATOR, 'testBranchName');
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
    app.node.setContext(CDKContextKey.BACKEND_DISAMBIGUATOR, 'testUser');
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

  void it('throws if backend-id is missing', () => {
    const app = new App();
    app.node.setContext(CDKContextKey.BACKEND_DISAMBIGUATOR, 'testEnvName');
    app.node.setContext(
      CDKContextKey.DEPLOYMENT_TYPE,
      BackendDeploymentType.BRANCH
    );
    assert.throws(() => createDefaultStack(app), {
      message: 'No context value present for backend-namespace key',
    });
  });

  void it('throws if branch-name is missing', () => {
    const app = new App();
    app.node.setContext(CDKContextKey.BACKEND_NAMESPACE, 'testBackendId');
    app.node.setContext(
      CDKContextKey.DEPLOYMENT_TYPE,
      BackendDeploymentType.BRANCH
    );
    assert.throws(() => createDefaultStack(app), {
      message: 'No context value present for backend-disambiguator key',
    });
  });

  void it('throws if deployment-type is missing', () => {
    const app = new App();
    app.node.setContext(CDKContextKey.BACKEND_NAMESPACE, 'testBackendId');
    app.node.setContext(CDKContextKey.BACKEND_DISAMBIGUATOR, 'testEnvName');
    assert.throws(() => createDefaultStack(app), {
      message: 'No context value present for deployment-type key',
    });
  });
});

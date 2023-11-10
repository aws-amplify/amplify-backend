import { describe, it } from 'node:test';
import { createDefaultStack } from './default_stack_factory.js';
import { App } from 'aws-cdk-lib';
import assert from 'node:assert';
import { AmplifyStack } from './engine/amplify_stack.js';

void describe('createDefaultRootStack', () => {
  void it('creates AmplifyStack with backend ID and branch from CDK context', () => {
    const app = new App();
    app.node.setContext('amplify-backend-namespace', 'testBackendId');
    app.node.setContext('amplify-backend-name', 'testBranchName');
    app.node.setContext('amplify-backend-type', 'branch');
    const stack = createDefaultStack(app);
    assert.ok(stack instanceof AmplifyStack);
    assert.strictEqual(
      stack.stackName,
      'amplify-testBackendId-testBranchName-branch-e482a1c36f'
    );
  });

  void it('creates sandbox AmplifyStack when deployment type is sandbox', () => {
    const app = new App();
    app.node.setContext('amplify-backend-namespace', 'testProjectName');
    app.node.setContext('amplify-backend-name', 'testUser');
    app.node.setContext('amplify-backend-type', 'sandbox');
    const stack = createDefaultStack(app);
    assert.ok(stack instanceof AmplifyStack);
    assert.strictEqual(
      stack.stackName,
      // eslint-disable-next-line spellcheck/spell-checker
      'amplify-testProjectName-testUser-sandbox-bf53214cb2'
    );
  });

  void it(`throws if amplify-backend-namespace is missing`, () => {
    const app = new App();
    app.node.setContext('amplify-backend-name', 'testEnvName');
    app.node.setContext('amplify-backend-type', 'branch');
    assert.throws(() => createDefaultStack(app), {
      message: `No context value present for amplify-backend-namespace key`,
    });
  });

  void it(`throws if amplify-backend-name is missing`, () => {
    const app = new App();
    app.node.setContext('amplify-backend-namespace', 'testBackendId');
    app.node.setContext('amplify-backend-type', 'branch');
    assert.throws(() => createDefaultStack(app), {
      message: `No context value present for amplify-backend-name key`,
    });
  });

  void it(`throws if amplify-backend-type is missing`, () => {
    const app = new App();
    app.node.setContext('amplify-backend-namespace', 'testBackendId');
    app.node.setContext('amplify-backend-name', 'testEnvName');
    assert.throws(() => createDefaultStack(app), {
      message: `No context value present for amplify-backend-type key`,
    });
  });
});

import { describe, it } from 'node:test';
import { createDefaultStack } from './default_stack_factory.js';
import { App } from 'aws-cdk-lib';
import assert from 'node:assert';
import { AmplifyStack } from './engine/amplify_stack.js';

describe('createDefaultRootStack', () => {
  it('creates AmplifyStack with project and env name from CDK context', () => {
    const app = new App();
    app.node.setContext('app-name', 'testAppName');
    app.node.setContext('branch-name', 'testEnvName');
    app.node.setContext('disambiguator', '1234');
    const stack = createDefaultStack(app);
    assert.ok(stack instanceof AmplifyStack);
    assert.strictEqual(stack.stackName, 'amplify-testAppName-1234-testEnvName');
  });

  it('throws if app name is missing', () => {
    const app = new App();
    app.node.setContext('branch-name', 'testEnvName');
    app.node.setContext('disambiguator', '1234');
    assert.throws(() => createDefaultStack(app), {
      message: 'No context value present for app-name key',
    });
  });

  it('throws if branch name is missing', () => {
    const app = new App();
    app.node.setContext('app-name', 'testAppName');
    app.node.setContext('disambiguator', '1234');
    assert.throws(() => createDefaultStack(app), {
      message: 'No context value present for branch-name key',
    });
  });

  it('throws if disambiguator is missing', () => {
    const app = new App();
    app.node.setContext('app-name', 'testAppName');
    app.node.setContext('branch-name', 'testEnvName');
    assert.throws(() => createDefaultStack(app), {
      message: 'No context value present for disambiguator key',
    });
  });
});

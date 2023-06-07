import { describe, it } from 'node:test';
import { createDefaultRootStack } from './default_stack.js';
import { App } from 'aws-cdk-lib';
import assert from 'node:assert';
import { AmplifyStack } from '@aws-amplify/backend-engine';

describe('createDefaultRootStack', () => {
  it('creates AmplifyStack with project and env name from CDK context', () => {
    const app = new App();
    app.node.setContext('project-name', 'testProjName');
    app.node.setContext('environment-name', 'testEnvName');
    const stack = createDefaultRootStack(app);
    assert.ok(stack instanceof AmplifyStack);
    assert.strictEqual(stack.stackName, 'testProjName-testEnvName');
  });
});

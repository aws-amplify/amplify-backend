import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { getBackendIdentifier } from './backend_identifier.js';

/**
 * Creates a minimal scope stub with a given node.id and optional CDK context.
 * Used to test the empty-id fallback path that CDK's Stack constructor prevents.
 */
const createScopeStub = (
  nodeId: string,
  context: Record<string, string> = {},
): Construct => {
  const app = new App();
  const stack = new Stack(app, nodeId || 'StubStack');
  // Override the id getter to return the desired value
  Object.defineProperty(stack.node, 'id', { get: () => nodeId });
  for (const [key, value] of Object.entries(context)) {
    app.node.setContext(key, value);
  }
  return stack;
};

void describe('getBackendIdentifier', () => {
  void it('returns context-based identifier when all CDK context values are present', () => {
    const app = new App();
    app.node.setContext('amplify-backend-namespace', 'testAppId');
    app.node.setContext('amplify-backend-name', 'main');
    app.node.setContext('amplify-backend-type', 'branch');
    const stack = new Stack(app, 'TestStack');

    const result = getBackendIdentifier(stack);

    assert.deepStrictEqual(result, {
      type: 'branch',
      namespace: 'testAppId',
      name: 'main',
    });
  });

  void it('returns standalone fallback with namespace "amplify" when node.id is "AmplifyStack" and no context', () => {
    const app = new App();
    const stack = new Stack(app, 'AmplifyStack');

    const result = getBackendIdentifier(stack);

    assert.deepStrictEqual(result, {
      type: 'standalone',
      namespace: 'amplify',
      name: 'default',
    });
  });

  void it('returns standalone fallback with node.id as namespace when node.id is a custom name and no context', () => {
    const app = new App();
    const stack = new Stack(app, 'MyCustomStack');

    const result = getBackendIdentifier(stack);

    assert.deepStrictEqual(result, {
      type: 'standalone',
      namespace: 'MyCustomStack',
      name: 'default',
    });
  });

  void it('returns standalone fallback with namespace "amplify" when node.id is empty and no context', () => {
    // CDK prevents empty IDs on non-root constructs, so we use a stub
    // to exercise the defensive `nodeId || 'amplify'` fallback.
    const scope = createScopeStub('');

    const result = getBackendIdentifier(scope);

    assert.deepStrictEqual(result, {
      type: 'standalone',
      namespace: 'amplify',
      name: 'default',
    });
  });
});

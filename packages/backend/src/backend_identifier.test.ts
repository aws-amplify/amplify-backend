import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import { getBackendIdentifier } from './backend_identifier.js';

const createStack = (context: Record<string, string>): Stack => {
  const app = new App();
  for (const [key, value] of Object.entries(context)) {
    app.node.setContext(key, value);
  }
  return new Stack(app, 'TestStack');
};

void describe('getBackendIdentifier', () => {
  void it('returns branch identifier when context type is branch', () => {
    const result = getBackendIdentifier(
      createStack({
        'amplify-backend-namespace': 'testAppId',
        'amplify-backend-name': 'main',
        'amplify-backend-type': 'branch',
      }),
    );
    assert.deepStrictEqual(result, {
      type: 'branch',
      namespace: 'testAppId',
      name: 'main',
    });
  });

  void it('returns sandbox identifier when context type is sandbox', () => {
    const result = getBackendIdentifier(
      createStack({
        'amplify-backend-namespace': 'projectName',
        'amplify-backend-name': 'testUser',
        'amplify-backend-type': 'sandbox',
      }),
    );
    assert.deepStrictEqual(result, {
      type: 'sandbox',
      namespace: 'projectName',
      name: 'testUser',
    });
  });

  void it('returns standalone identifier when context type is standalone', () => {
    const result = getBackendIdentifier(
      createStack({
        'amplify-backend-namespace': 'myCustomStack',
        'amplify-backend-name': 'default',
        'amplify-backend-type': 'standalone',
      }),
    );
    assert.deepStrictEqual(result, {
      type: 'standalone',
      namespace: 'myCustomStack',
      name: 'default',
    });
  });

  void it('throws when deployment type is not recognized', () => {
    assert.throws(
      () =>
        getBackendIdentifier(
          createStack({
            'amplify-backend-namespace': 'ns',
            'amplify-backend-name': 'name',
            'amplify-backend-type': 'invalid',
          }),
        ),
      {
        message: /CDK context value is not in \(sandbox, branch, standalone\)/,
      },
    );
  });

  void it('throws when namespace context is missing', () => {
    assert.throws(
      () =>
        getBackendIdentifier(
          createStack({
            'amplify-backend-name': 'main',
            'amplify-backend-type': 'standalone',
          }),
        ),
      {
        message: /amplify-backend-namespace CDK context value is not a string/,
      },
    );
  });

  void it('throws when name context is missing', () => {
    assert.throws(
      () =>
        getBackendIdentifier(
          createStack({
            'amplify-backend-namespace': 'ns',
            'amplify-backend-type': 'standalone',
          }),
        ),
      {
        message: /amplify-backend-name CDK context value is not a string/,
      },
    );
  });
});

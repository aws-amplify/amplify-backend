import { describe, it } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { App, Stack } from 'aws-cdk-lib';
import { getBackendIdentifier } from './backend_identifier.js';

/**
 * Property: Backend identifier resolution correctness
 *
 * getBackendIdentifier returns a deterministic BackendIdentifier:
 * (a) with context → matches context values exactly
 * (b) without context → standalone with namespace from scope's node ID
 */
void describe('Backend identifier resolution correctness', () => {
  const validDeploymentTypes = ['sandbox', 'branch', 'standalone'] as const;

  // Arbitrary for non-empty alphanumeric strings (valid CDK context values)
  const nonEmptyAlphanumStr = fc.stringMatching(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/,
  );

  // CDK Stack names must match /^[A-Za-z][A-Za-z0-9-]*$/
  const validStackNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9-]{0,29}$/);

  void it('all context present → returns exact context values', () => {
    fc.assert(
      fc.property(
        nonEmptyAlphanumStr,
        nonEmptyAlphanumStr,
        fc.constantFrom(...validDeploymentTypes),
        validStackNameArb,
        (namespace, name, deploymentType, nodeId) => {
          const app = new App();
          app.node.setContext('amplify-backend-namespace', namespace);
          app.node.setContext('amplify-backend-name', name);
          app.node.setContext('amplify-backend-type', deploymentType);
          const stack = new Stack(app, nodeId);

          const result = getBackendIdentifier(stack);

          assert.deepStrictEqual(result, {
            type: deploymentType,
            namespace: namespace,
            name: name,
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  void it('no context → returns standalone with deterministic namespace from node ID', () => {
    fc.assert(
      fc.property(validStackNameArb, (nodeId) => {
        const app = new App();
        const stack = new Stack(app, nodeId);

        const result = getBackendIdentifier(stack);

        assert.strictEqual(result.type, 'standalone');
        assert.strictEqual(result.name, 'default');

        // Namespace is deterministic based on node ID
        const expectedNamespace = nodeId || 'amplify';
        assert.strictEqual(result.namespace, expectedNamespace);
      }),
      { numRuns: 100 },
    );
  });

  void it('no context → result is deterministic (same input produces same output)', () => {
    fc.assert(
      fc.property(validStackNameArb, (nodeId) => {
        const app1 = new App();
        const stack1 = new Stack(app1, nodeId);
        const result1 = getBackendIdentifier(stack1);

        const app2 = new App();
        const stack2 = new Stack(app2, nodeId);
        const result2 = getBackendIdentifier(stack2);

        assert.deepStrictEqual(result1, result2);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property: Branch identifier backward compatibility
 *
 * With DEPLOYMENT_TYPE = 'branch', getBackendIdentifier returns the same
 * result as the pre-standalone behavior.
 */
void describe('Branch identifier backward compatibility', () => {
  // Arbitrary for non-empty alphanumeric strings (valid CDK context values)
  const nonEmptyAlphanumStr = fc.stringMatching(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,49}$/,
  );

  // CDK Stack names must match /^[A-Za-z][A-Za-z0-9-]*$/
  const validStackNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9-]{0,29}$/);

  void it('branch context → returns exact namespace and name with type branch', () => {
    fc.assert(
      fc.property(
        nonEmptyAlphanumStr,
        nonEmptyAlphanumStr,
        validStackNameArb,
        (namespace, name, nodeId) => {
          const app = new App();
          app.node.setContext('amplify-backend-namespace', namespace);
          app.node.setContext('amplify-backend-name', name);
          app.node.setContext('amplify-backend-type', 'branch');
          const stack = new Stack(app, nodeId);

          const result = getBackendIdentifier(stack);

          assert.deepStrictEqual(result, {
            type: 'branch',
            namespace: namespace,
            name: name,
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

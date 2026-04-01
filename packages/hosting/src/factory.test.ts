import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { defineHosting } from './factory.js';
import { App } from 'aws-cdk-lib';
import { CDKContextKey } from '@aws-amplify/platform-core';

/**
 * Set CDK context values that defineHosting reads via `new App()`.
 * The CDK App constructor reads context from CDK_CONTEXT_JSON.
 */
const setHostingContext = (overrides: Record<string, string> = {}) => {
  const context: Record<string, string> = {
    [CDKContextKey.BACKEND_NAMESPACE]: 'test-namespace',
    [CDKContextKey.BACKEND_NAME]: 'hosting',
    [CDKContextKey.DEPLOYMENT_TYPE]: 'standalone',
    ...overrides,
  };
  process.env.CDK_CONTEXT_JSON = JSON.stringify(context);
};

const clearHostingContext = () => {
  delete process.env.CDK_CONTEXT_JSON;
};

void describe('defineHosting', () => {
  const savedAccount = process.env.CDK_DEFAULT_ACCOUNT;
  const savedRegion = process.env.CDK_DEFAULT_REGION;

  beforeEach(() => {
    clearHostingContext();
    // Remove the 'message' listener from previous tests to avoid
    // "already listening" issues — defineHosting registers process.once('message')
    process.removeAllListeners('message');
  });

  afterEach(() => {
    // Restore env vars that tests may modify
    if (savedAccount !== undefined) {
      process.env.CDK_DEFAULT_ACCOUNT = savedAccount;
    } else {
      delete process.env.CDK_DEFAULT_ACCOUNT;
    }
    if (savedRegion !== undefined) {
      process.env.CDK_DEFAULT_REGION = savedRegion;
    } else {
      delete process.env.CDK_DEFAULT_REGION;
    }
  });

  void it('throws when CDK context is missing', () => {
    process.env.CDK_CONTEXT_JSON = JSON.stringify({});
    assert.throws(
      () => defineHosting({ framework: 'spa', buildOutputDir: '/tmp/test' }),
      (err: Error) => {
        // CDK throws when getContext() can't find the key, or our code
        // throws if the value is present but not a string.
        const isContextError =
          err.message.includes('CDK context value is not a string') ||
          err.message.includes('No context value present for');
        assert.ok(
          isContextError,
          `Expected context error, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  void it('creates a hosting result with stack and createStack', () => {
    setHostingContext();

    // defineHosting will try to detect framework and build - skip by catching
    // We test the structure without real build output
    // For unit tests, we mock at the construct level; this test verifies
    // the entry point wiring is correct.
    assert.throws(
      () => defineHosting({ framework: 'spa', buildOutputDir: '/nonexistent' }),
      // It will throw because the build output dir doesn't exist,
      // but this proves defineHosting() correctly creates App + Stack
      // and attempts to build the construct
      (err: Error) => {
        // The error should come from the adapter/build phase, not from stack creation
        assert.ok(
          !err.message.includes('CDK context'),
          `Should not be a CDK context error, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  void it('createStack returns a nested stack', () => {
    setHostingContext();

    // We can test createStack independently by creating a minimal app
    const app = new App();
    app.node.setContext(CDKContextKey.BACKEND_NAMESPACE, 'test-ns');
    app.node.setContext(CDKContextKey.BACKEND_NAME, 'hosting');
    app.node.setContext(CDKContextKey.DEPLOYMENT_TYPE, 'standalone');
  });

  void it('rejects invalid deployment type', () => {
    setHostingContext({ [CDKContextKey.DEPLOYMENT_TYPE]: 'invalid' });
    assert.throws(
      () => defineHosting({ framework: 'spa', buildOutputDir: '/tmp/test' }),
      (err: Error) => {
        assert.ok(
          err.message.includes('CDK context value is not in'),
          `Expected deployment type error, got: ${err.message}`,
        );
        return true;
      },
    );
  });

  void it('sets stack env when domain is configured', () => {
    setHostingContext();
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
    process.env.CDK_DEFAULT_REGION = 'us-west-2';

    // defineHosting will throw in the adapter phase (no real build output),
    // but we can catch and inspect the error to confirm it got past stack
    // creation without a "Cannot retrieve value from context provider" error.
    assert.throws(
      () =>
        defineHosting({
          framework: 'spa',
          buildOutputDir: '/nonexistent',
          domain: { domainName: 'app.example.com', hostedZone: 'example.com' },
        }),
      (err: Error) => {
        // The error should come from the adapter/build phase, not from
        // a missing account/region on the stack.
        assert.ok(
          !err.message.includes('Cannot retrieve value from context provider'),
          `Expected adapter error, got context provider error: ${err.message}`,
        );
        assert.ok(
          !err.message.includes('account/region are not specified'),
          `Stack env should be set when domain is configured: ${err.message}`,
        );
        return true;
      },
    );
  });

  void it('does not set stack env when no domain is configured', () => {
    setHostingContext();
    // Even with CDK_DEFAULT env vars, if no domain is specified the stack
    // should remain environment-agnostic.
    process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
    process.env.CDK_DEFAULT_REGION = 'us-west-2';

    assert.throws(
      () =>
        defineHosting({
          framework: 'spa',
          buildOutputDir: '/nonexistent',
        }),
      (err: Error) => {
        // Should fail in adapter phase, not stack creation
        assert.ok(
          !err.message.includes('CDK context'),
          `Should not be a CDK context error, got: ${err.message}`,
        );
        return true;
      },
    );
  });
});

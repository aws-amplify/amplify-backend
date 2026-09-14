/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

// Local re-export shims (the public surface of @aws-amplify/hosting).
import {
  AmplifyHostingConstruct,
  generateBuildId,
  generateBuildIdFunctionCode,
} from './constructs/hosting_construct.js';
import * as adapters from './adapters/index.js';
import { HostingError } from './hosting_error.js';
import * as index from './index.js';

// The upstream implementation these shims re-export.
import { HostingConstruct } from '@aws-blocks/hosting/constructs';
import {
  detectFramework as upstreamDetectFramework,
  nextjsAdapter as upstreamNextjsAdapter,
} from '@aws-blocks/hosting/adapters';
import { HostingError as UpstreamHostingError } from '@aws-blocks/hosting/error';

/**
 * Parity coverage for the re-export shims.
 *
 * The construct, adapters, manifest, and build defaults moved upstream to
 * `@aws-blocks/hosting`; this package re-exports them (aliasing the construct
 * to `AmplifyHostingConstruct`). The upstream package owns the behavioral
 * suite for the implementation itself — these tests assert only that OUR
 * wiring exposes the upstream symbols under the names/sub-paths consumers
 * (and the vanilla-CDK integration tests) depend on, and that the wired-up
 * construct still synthesizes the expected infrastructure.
 */
void describe('shim parity with @aws-blocks/hosting', () => {
  void it('AmplifyHostingConstruct is the upstream HostingConstruct', () => {
    assert.strictEqual(AmplifyHostingConstruct, HostingConstruct);
  });

  void it('./error re-exports the upstream HostingError', () => {
    assert.strictEqual(HostingError, UpstreamHostingError);
  });

  void it('./constructs re-exports the build-id helpers', () => {
    assert.strictEqual(typeof generateBuildId, 'function');
    assert.strictEqual(typeof generateBuildIdFunctionCode, 'function');
  });

  void it('./adapters re-exports the framework adapters + registry helpers', () => {
    // Framework adapters.
    for (const name of [
      'spaAdapter',
      'nextjsAdapter',
      'nitroAdapter',
      'nuxtAdapter',
      'astroAdapter',
    ]) {
      assert.strictEqual(
        typeof (adapters as any)[name],
        'function',
        `adapters.${name} should be a function`,
      );
    }
    // Registry helpers.
    for (const name of [
      'detectFramework',
      'getAdapter',
      'readProjectDeps',
      'readProjectDepsStrict',
    ]) {
      assert.strictEqual(
        typeof (adapters as any)[name],
        'function',
        `adapters.${name} should be a function`,
      );
    }
    // Same function objects as upstream (true re-export, not a wrapper).
    assert.strictEqual(adapters.detectFramework, upstreamDetectFramework);
    assert.strictEqual(adapters.nextjsAdapter, upstreamNextjsAdapter);
  });

  void it('package index re-exports the documented public API', () => {
    for (const name of [
      'defineHosting',
      'definePipeline',
      'AmplifyHostingConstruct',
      'AmplifyPipelineConstruct',
      'generateBuildId',
      'HostingError',
    ]) {
      assert.ok(
        (index as any)[name] !== undefined,
        `index should export ${name}`,
      );
    }
  });

  void it('the wired-up AmplifyHostingConstruct synthesizes core hosting infra', () => {
    const app = new App();
    const stack = new Stack(app, 'ParityStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    // Minimal static (SPA-style) manifest: no compute, single catch-all to S3.
    const manifest = {
      version: 1 as const,
      compute: {},
      staticAssets: { directory: '.' },
      routes: [{ pattern: '/*', target: 'static' }],
      buildId: 'parity-build-1',
    };

    new AmplifyHostingConstruct(stack, 'hosting', {
      manifest: manifest as any,
      // us-east-1 stack so region-sensitive resources (WAF/edge) don't trip;
      // skipRegionValidation keeps the synth hermetic regardless.
      skipRegionValidation: true,
    } as any);

    const template = Template.fromStack(stack);
    // The static deploy must still wire an S3 origin behind a CloudFront
    // distribution — the load-bearing shape of the hosting construct. Assert
    // the distribution count exactly and that at least one bucket exists
    // (the construct also provisions auxiliary buckets, e.g. access logs).
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    const buckets = template.findResources('AWS::S3::Bucket');
    assert.ok(
      Object.keys(buckets).length >= 1,
      'expected at least one S3 bucket (hosting origin)',
    );
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as hosting from './index.js';
import * as pipeline from './pipeline/index.js';
import {
  config as blocksConfig,
  getConfig as blocksGetConfig,
  getSecret as blocksGetSecret,
  secret as blocksSecret,
} from '@aws-blocks/hosting';

/**
 * Guards the self-managed secrets/config seam this package adds: `@aws-amplify/
 * hosting` (and `/pipeline`) must re-export the same CDK-free value API that
 * `@aws-blocks/hosting` owns, so `defineHosting`/`definePipeline` consumers can
 * reference `secret('KEY')` / `config('KEY')` and read them back with
 * `getSecret` / `getConfig`. The marker semantics themselves are owned and
 * tested by aws-blocks; here we assert only that the re-export is wired and
 * identical.
 */
void describe('self-managed hosting secret/config value API', () => {
  void it('re-exports the value API from @aws-amplify/hosting unchanged', () => {
    assert.strictEqual(hosting.secret, blocksSecret);
    assert.strictEqual(hosting.config, blocksConfig);
    assert.strictEqual(hosting.getSecret, blocksGetSecret);
    assert.strictEqual(hosting.getConfig, blocksGetConfig);
    assert.strictEqual(typeof hosting.isSecret, 'function');
    assert.strictEqual(typeof hosting.isConfig, 'function');
    assert.strictEqual(typeof hosting.isManagedValue, 'function');
  });

  void it('re-exports the same value API from @aws-amplify/hosting/pipeline', () => {
    assert.strictEqual(pipeline.secret, blocksSecret);
    assert.strictEqual(pipeline.config, blocksConfig);
    assert.strictEqual(pipeline.getSecret, blocksGetSecret);
    assert.strictEqual(pipeline.getConfig, blocksGetConfig);
  });

  void it('secret() produces a Secrets Manager marker', () => {
    const marker = hosting.secret('STRIPE_KEY');
    assert.strictEqual(marker.kind, 'secret');
    assert.strictEqual(marker.key, 'STRIPE_KEY');
    assert.strictEqual(hosting.isSecret(marker), true);
    assert.strictEqual(hosting.isConfig(marker), false);
    assert.strictEqual(hosting.isManagedValue(marker), true);
  });

  void it('config() produces an SSM Parameter Store marker', () => {
    const marker = hosting.config('FEATURE_FLAGS');
    assert.strictEqual(marker.kind, 'config');
    assert.strictEqual(marker.key, 'FEATURE_FLAGS');
    assert.strictEqual(hosting.isConfig(marker), true);
    assert.strictEqual(hosting.isSecret(marker), false);
    assert.strictEqual(hosting.isManagedValue(marker), true);
  });

  void it('byoSecret/byoConfig produce inert BYO reference markers', () => {
    const s = hosting.byoSecret('my/app/legacy-token');
    assert.strictEqual(s.kind, 'secret');
    assert.strictEqual(s.ref, 'my/app/legacy-token');
    assert.strictEqual(hosting.isByoValue(s), true);
    assert.strictEqual(hosting.isSecret(s), false);

    const c = hosting.byoConfig('/my/app/flags');
    assert.strictEqual(c.kind, 'config');
    assert.strictEqual(c.ref, '/my/app/flags');
    assert.strictEqual(hosting.isByoValue(c), true);

    assert.strictEqual(hosting.isByoValue({}), false);
    assert.strictEqual(hosting.isByoValue(hosting.secret('X')), false);
  });

  void it('markers are inert plain objects (safe to commit — no value)', () => {
    const marker = hosting.secret('STRIPE_KEY') as unknown as Record<
      string,
      unknown
    >;
    assert.strictEqual('value' in marker, false);
  });
});

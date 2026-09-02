import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { HostingValueStore } from './hosting_value_store.js';

/**
 * A minimal fake AWS SDK client that records the command inputs it receives and
 * returns canned responses keyed by command constructor name.
 */
const fakeClient = (
  responses: Record<string, unknown> = {},
): {
  send: (cmd: unknown) => Promise<unknown>;
  calls: Array<{ name: string; input: unknown }>;
} => {
  const calls: Array<{ name: string; input: unknown }> = [];
  return {
    calls,
    send: async (cmd: unknown) => {
      const name = (cmd as { constructor: { name: string } }).constructor.name;
      calls.push({ name, input: (cmd as { input: unknown }).input });
      return responses[name] ?? {};
    },
  };
};

const makeProject = (name: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hv-store-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name }));
  return dir;
};

void describe('HostingValueStore', () => {
  let projectDir: string;
  beforeEach(() => {
    projectDir = makeProject('amplify-next-app-router');
  });
  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  void it('computes the Secrets Manager locator (leading slash stripped)', () => {
    const store = new HostingValueStore('secret', projectDir);
    // Drift guard: must match what defineHosting wires as secretStore.prefix.
    assert.strictEqual(
      store.locator('STRIPE_KEY'),
      'amplify/hosting/amplify-next-app-router/secrets/STRIPE_KEY',
    );
  });

  void it('computes the SSM locator (leading slash kept)', () => {
    const store = new HostingValueStore('config', projectDir);
    assert.strictEqual(
      store.locator('DOMAIN_PROD'),
      '/amplify/hosting/amplify-next-app-router/config/DOMAIN_PROD',
    );
  });

  void it('sanitizes a scoped/odd package name into the identifier', () => {
    const dir = makeProject('@my-org/My.App!');
    const store = new HostingValueStore('config', dir);
    assert.strictEqual(store.locator('K'), '/amplify/hosting/My-App/config/K');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  void it('config setValue writes an SSM String parameter (Overwrite)', async () => {
    const ssm = fakeClient();
    const store = new HostingValueStore('config', projectDir, {
      ssm: ssm as never,
    });
    await store.setValue('DOMAIN_PROD', 'prod.example.com');
    const put = ssm.calls.find((c) => c.name === 'PutParameterCommand');
    assert.ok(put, 'expected PutParameterCommand');
    assert.deepStrictEqual(put!.input, {
      Name: '/amplify/hosting/amplify-next-app-router/config/DOMAIN_PROD',
      Value: 'prod.example.com',
      Type: 'String',
      Overwrite: true,
    });
  });

  void it('secret setValue puts to Secrets Manager', async () => {
    const secrets = fakeClient();
    const store = new HostingValueStore('secret', projectDir, {
      secrets: secrets as never,
    });
    await store.setValue('STRIPE_KEY', 'sk_live_x');
    const put = secrets.calls.find((c) => c.name === 'PutSecretValueCommand');
    assert.ok(put, 'expected PutSecretValueCommand');
    assert.deepStrictEqual(put!.input, {
      SecretId: 'amplify/hosting/amplify-next-app-router/secrets/STRIPE_KEY',
      SecretString: 'sk_live_x',
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateProviderCode } from './provider_code_generator.js';

void describe('generateProviderCode', () => {
  void it('returns empty string when no provider specified', () => {
    const code = generateProviderCode({
      connectionUriSecret: 'DB_URI',
    });
    assert.strictEqual(code, '');
  });

  void it('generates Aurora provisioning code', () => {
    const code = generateProviderCode({
      provider: 'aurora',
      connectionUriSecret: 'DB_URI',
      auroraProvision: true,
    });

    assert.ok(code.includes('aurora'));
    assert.ok(code.includes('provision'));
    assert.ok(code.includes('databaseName'));
    assert.ok(!code.includes('connectionUri'));
  });

  void it('generates Aurora connection code', () => {
    const code = generateProviderCode({
      provider: 'aurora',
      connectionUriSecret: 'DB_URI',
      auroraProvision: false,
    });

    assert.ok(code.includes('aurora'));
    assert.ok(code.includes('connectionUri'));
    assert.ok(code.includes("secret('DB_URI')"));
    assert.ok(!code.includes('provision'));
  });

  void it('generates RDS connection code', () => {
    const code = generateProviderCode({
      provider: 'rds',
      connectionUriSecret: 'DB_URI',
    });

    assert.ok(code.includes('rds'));
    assert.ok(code.includes('connectionUri'));
    assert.ok(code.includes("secret('DB_URI')"));
  });
});

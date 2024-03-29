import { describe, it } from 'node:test';
import { getSecretClient } from './secret.js';
import { SSMSecretClient } from './ssm_secret.js';
import assert from 'node:assert';

void describe('SecretClient', () => {
  void it('returns a secret client instance', () => {
    const secretClient = getSecretClient();
    assert.ok(secretClient instanceof SSMSecretClient);
  });
});

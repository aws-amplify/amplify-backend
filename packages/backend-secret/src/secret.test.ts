import { describe, it } from 'node:test';
import { SecretClient } from './secret.js';
import { SSMSecret } from './ssm_secret.js';
import assert from 'node:assert';

describe('SecretClient', () => {
  it('returns a secret client instance', () => {
    const secretClient = SecretClient();
    assert.ok(secretClient instanceof SSMSecret);
  });
});

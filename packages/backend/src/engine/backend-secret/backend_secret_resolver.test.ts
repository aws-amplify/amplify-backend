import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SecretValue } from 'aws-cdk-lib';
import {
  BackendSecret,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { DefaultBackendSecretResolver } from './backend_secret_resolver.js';

const invalidSecretName = 'errorSecretName';

class TestBackendSecret implements BackendSecret {
  constructor(private readonly secretName: string) {}
  resolve = (): SecretValue => {
    if (this.secretName === invalidSecretName) {
      throw new Error(`Failed to resolve!`);
    }
    return SecretValue.unsafePlainText(this.secretName);
  };
}

describe('DefaultBackendSecretResolver', () => {
  it('throws if failed to resolve a secret', () => {
    const arg = {
      a: new TestBackendSecret('c1'),
      b: 'abc',
      c: {
        c1: new TestBackendSecret('secret_C1'),
        c2: {
          c21: new TestBackendSecret(invalidSecretName),
          c22: 123,
        },
        c3: 'c3',
      },
    };
    const resolver = new DefaultBackendSecretResolver(
      {} as Construct,
      {} as UniqueBackendIdentifier
    );
    assert.throws(
      () => resolver.resolveSecrets(arg),
      new Error('Failed to resolve!')
    );
  });

  it('returns resolve secrets', () => {
    const arg = {
      a: new TestBackendSecret('c1'),
      b: 'abc',
      c: {
        c1: new TestBackendSecret('secret_C1'),
        c2: {
          c21: new TestBackendSecret('secret_C21'),
          c22: 123,
        },
        c3: 'c3',
      },
      d: [
        1,
        2,
        'd',
        {
          d1: new TestBackendSecret('secret_D1'),
        },
      ],
    };

    const resolver = new DefaultBackendSecretResolver(
      {} as Construct,
      {} as UniqueBackendIdentifier
    );
    assert.deepStrictEqual(resolver.resolveSecrets(arg), {
      a: SecretValue.unsafePlainText('c1'),
      b: 'abc',
      c: {
        c1: SecretValue.unsafePlainText('secret_C1'),
        c2: {
          c21: SecretValue.unsafePlainText('secret_C21'),
          c22: 123,
        },
        c3: 'c3',
      },
      d: [
        1,
        2,
        'd',
        {
          d1: SecretValue.unsafePlainText('secret_D1'),
        },
      ],
    });
  });
});

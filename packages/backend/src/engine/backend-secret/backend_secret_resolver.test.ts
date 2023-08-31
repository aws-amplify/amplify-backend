import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SecretValue } from 'aws-cdk-lib';
import { BackendSecret } from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { DeepBackendSecretResolver } from './backend_secret_resolver.js';

const UNRESOLVABLE_SECRET_NAME = 'errorSecretName';

class TestBackendSecret implements BackendSecret {
  constructor(private readonly secretName: string) {}
  resolve = (
    scope: Construct, // eslint-disable-line @typescript-eslint/no-unused-vars
    projectName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    branchName: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ): SecretValue => {
    if (this.secretName === UNRESOLVABLE_SECRET_NAME) {
      throw new Error(`Failed to resolve!`);
    }
    return SecretValue.unsafePlainText(this.secretName);
  };
}

describe('BackendSecretResolverImpl', () => {
  it('throws if failed to resolve a secret', () => {
    const arg = {
      a: new TestBackendSecret('c1'),
      b: 'abc',
      c: {
        c1: new TestBackendSecret('secret_C1'),
        c2: {
          c21: new TestBackendSecret(UNRESOLVABLE_SECRET_NAME),
          c22: 123,
        },
        c3: 'c3',
      },
    };
    const resolver = new DeepBackendSecretResolver({} as Construct, '', '');
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

    const resolver = new DeepBackendSecretResolver({} as Construct, '', '');
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

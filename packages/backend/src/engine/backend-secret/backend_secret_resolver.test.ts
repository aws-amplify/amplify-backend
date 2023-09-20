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

class TestClassWithPrivateMembers1 {
  constructor(private readonly a: number, public c: number) {}
  private somePrivateMethod = (): number => {
    return this.a;
  };
  public getC = (): number => this.c;
}

class TestClassWithPrivateMembers2 {
  constructor(private readonly x: number, public y: number, public z: number) {}
  private privateMethod2 = (): number => {
    return this.x;
  };
  public getY = (): number => this.y;
}

describe('DefaultBackendSecretResolver', () => {
  it('throws if failed to resolve a secret', () => {
    const arg = {
      a: new TestBackendSecret('c1'),
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
    const cannotTransformObj1 = new TestClassWithPrivateMembers1(1, 2);
    const cannotTransformObj2 = new TestClassWithPrivateMembers2(3, 4, 5);
    const arg = {
      a: new TestBackendSecret('c1'),
      c: {
        c1: new TestBackendSecret('secret_C1'),
        c2: {
          c21: new TestBackendSecret('secret_C21'),
          c22: 123,
          c23: {
            c231: cannotTransformObj2,
          },
        },
        c3: 'c3',
      },
      d: [
        1,
        'd',
        {
          d1: new TestBackendSecret('secret_D1'),
        },
      ],
      e: cannotTransformObj1,
    };

    const resolver = new DefaultBackendSecretResolver(
      {} as Construct,
      {} as UniqueBackendIdentifier
    );

    assert.deepStrictEqual(
      resolver.resolveSecrets<
        typeof arg,
        [TestClassWithPrivateMembers1, TestClassWithPrivateMembers2]
      >(arg, [TestClassWithPrivateMembers1, TestClassWithPrivateMembers2]),
      {
        a: SecretValue.unsafePlainText('c1'),
        c: {
          c1: SecretValue.unsafePlainText('secret_C1'),
          c2: {
            c21: SecretValue.unsafePlainText('secret_C21'),
            c22: 123,
            c23: {
              c231: cannotTransformObj2,
            },
          },
          c3: 'c3',
        },
        d: [
          1,
          'd',
          {
            d1: SecretValue.unsafePlainText('secret_D1'),
          },
        ],
        e: cannotTransformObj1,
      }
    );
  });
});

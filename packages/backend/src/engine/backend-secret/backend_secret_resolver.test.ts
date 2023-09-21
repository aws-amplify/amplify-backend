import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SecretValue } from 'aws-cdk-lib';
import {
  BackendSecret,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';
import { DefaultBackendSecretResolver } from './backend_secret_resolver.js';
import { Construct } from 'constructs';

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
  const testStack = {} as Construct;
  const resolver = new DefaultBackendSecretResolver(
    {} as UniqueBackendIdentifier
  );

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

    assert.throws(
      () => resolver.resolveSecrets(testStack, arg),
      new Error('Failed to resolve!')
    );
  });

  it('returns resolve secrets without any types to ignore', () => {
    const arg = {
      a: new TestBackendSecret('c1'),
      c: {
        c2: {
          c21: new TestBackendSecret('secret_C21'),
        },
        c3: 'c3',
      },
    };

    assert.deepStrictEqual(resolver.resolveSecrets(testStack, arg), {
      a: SecretValue.unsafePlainText('c1'),
      c: {
        c2: {
          c21: SecretValue.unsafePlainText('secret_C21'),
        },
        c3: 'c3',
      },
    });
  });

  it('returns resolve secrets with some types to ignore', () => {
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

    assert.deepStrictEqual(
      resolver.resolveSecrets<
        typeof arg,
        [TestClassWithPrivateMembers1, TestClassWithPrivateMembers2]
      >(testStack, arg, [
        TestClassWithPrivateMembers1,
        TestClassWithPrivateMembers2,
      ]),
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

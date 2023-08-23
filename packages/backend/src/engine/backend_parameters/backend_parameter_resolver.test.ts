import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SecretValue } from 'aws-cdk-lib';
import { BackendParameter } from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { OptionalPassThroughBackendParameterResolver } from './backend_parameter_resolver.js';

const UNRESOLVABLE_PARAM_NAME = 'errorParam';

class TestBackendParameter implements BackendParameter {
  constructor(private readonly paramName: string) {}
  resolve(
    scope: Construct,
    projectName: string,
    branchName: string
  ): SecretValue {
    if (this.paramName === UNRESOLVABLE_PARAM_NAME) {
      throw new Error('Failed to resolve!');
    }
    return SecretValue.unsafePlainText(this.paramName);
  }
}

describe('OptionalPassThroughBackendParameterResolver', () => {
  it('throws if failed to resolve a parameter', () => {
    const arg = {
      a: new TestBackendParameter('c1'),
      b: 'abc',
      c: {
        c1: new TestBackendParameter('secret_C1'),
        c2: {
          c21: new TestBackendParameter(UNRESOLVABLE_PARAM_NAME),
          c22: 123,
        },
        c3: 'c3',
      },
    };
    const resolver = new OptionalPassThroughBackendParameterResolver(
      {} as any,
      '',
      ''
    );
    assert.throws(
      () => resolver.resolveParameters(arg),
      new Error('Failed to resolve!')
    );
  });

  it('returns resolve parameters', () => {
    const arg = {
      a: new TestBackendParameter('c1'),
      b: 'abc',
      c: {
        c1: new TestBackendParameter('secret_C1'),
        c2: {
          c21: new TestBackendParameter('secret_C21'),
          c22: 123,
        },
        c3: 'c3',
      },
      d: [
        1,
        2,
        'd',
        {
          d1: new TestBackendParameter('secret_D1'),
        },
      ],
    };

    const resolver = new OptionalPassThroughBackendParameterResolver(
      {} as any,
      '',
      ''
    );
    assert.deepStrictEqual(resolver.resolveParameters(arg), {
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

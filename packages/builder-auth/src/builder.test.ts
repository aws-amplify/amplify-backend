import { describe, it } from 'node:test';
import { Auth } from './builder.js';
import { App, Stack } from 'aws-cdk-lib';
import assert from 'node:assert';

describe('Auth builder', () => {
  it('creates singleton auth construct instance', () => {
    const authBuilder = new Auth({
      loginMechanisms: ['username'],
    });

    const app = new App();
    const stack = new Stack(app, 'test');
    const authConstruct1 = authBuilder.build(stack, 'testAuth');
    const authConstruct2 = authBuilder.build(stack, 'somethingElse');

    assert.strictEqual(authConstruct1, authConstruct2);
  });
});

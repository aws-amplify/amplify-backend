import * as nodeTest from 'node:test';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { propagateErrorCause } from './propagate_error_cause';

RuleTester.afterAll = nodeTest.after;
// See https://typescript-eslint.io/packages/rule-tester/#with-specific-frameworks
// Node test runner methods return promises which are not relevant in the context of testing.
// We do ignore them in other places with void keyword.
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.it = nodeTest.it;
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.describe = nodeTest.describe;

const ruleTester = new RuleTester();

ruleTester.run('propagate-error-cause', propagateErrorCause, {
  valid: [
    "new AmplifyUserError('SomeError', {}, new Error('underlying error from somewhere else'))",
    "new AmplifyFault('SomeFault', {}, new Error('underlying error from somewhere else'))",
    "new AmplifyError('SomeError', {}, new Error('underlying error from somewhere else'))",
  ],
  invalid: [
    {
      code: "new AmplifyUserError('SomeError', {})",
      errors: [
        {
          messageId: 'noCausePropagation',
        },
      ],
    },
    {
      code: "new AmplifyFault('SomeFault', {}",
      errors: [
        {
          messageId: 'noCausePropagation',
        },
      ],
    },
    {
      code: "new AmplifyError('SomeError', {}",
      errors: [
        {
          messageId: 'noCausePropagation',
        },
      ],
    },
  ],
});

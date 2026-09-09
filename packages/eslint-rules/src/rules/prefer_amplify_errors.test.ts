import * as nodeTest from 'node:test';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { preferAmplifyErrorsRule } from './prefer_amplify_errors';

RuleTester.afterAll = nodeTest.after;
// See https://typescript-eslint.io/packages/rule-tester/#with-specific-frameworks
// Node test runner methods return promises which are not relevant in the context of testing.
// We do ignore them in other places with void keyword.
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.it = nodeTest.it;
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.describe = nodeTest.describe;

const ruleTester = new RuleTester();

ruleTester.run('prefer-amplify-errors', preferAmplifyErrorsRule, {
  valid: ['throw new AmplifyUserError()', 'throw new AmplifyFault()'],
  invalid: [
    {
      code: 'throw new Error()',
      errors: [
        {
          messageId: 'useOfErrorDetected',
        },
      ],
    },
  ],
});

import * as nodeTest from 'node:test';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { amplifyErrorNameRule } from './amplify_error_name.js';

RuleTester.afterAll = nodeTest.after;
// See https://typescript-eslint.io/packages/rule-tester/#with-specific-frameworks
// Node test runner methods return promises which are not relevant in the context of testing.
// We do ignore them in other places with void keyword.
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.it = nodeTest.it;
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.describe = nodeTest.describe;

const ruleTester = new RuleTester();

ruleTester.run('amplify-error-name', amplifyErrorNameRule, {
  valid: [
    "new AmplifyUserError('ValidErrorNameError', {}, new Error())",
    "new AmplifyFault('ValidFaultNameFault', {}, new Error())",
  ],
  invalid: [
    {
      code: "new AmplifyUserError('InvalidErrorNameFault', {}, new Error())",
      errors: [
        {
          messageId: 'properAmplifyErrorSuffix',
        },
      ],
    },
    {
      code: "new AmplifyUserError('InvalidErrorName', {}, new Error())",
      errors: [
        {
          messageId: 'properAmplifyErrorSuffix',
        },
      ],
    },
    {
      code: "new AmplifyFault('InvalidFaultNameError', {}, new Error())",
      errors: [
        {
          messageId: 'properAmplifyFaultSuffix',
        },
      ],
    },
    {
      code: "new AmplifyFault('InvalidFaultName', {}, new Error())",
      errors: [
        {
          messageId: 'properAmplifyFaultSuffix',
        },
      ],
    },
  ],
});

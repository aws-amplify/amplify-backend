import * as nodeTest from 'node:test';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { rule } from './no_empty_catch.js';

RuleTester.afterAll = nodeTest.after;
// See https://typescript-eslint.io/packages/rule-tester/#with-specific-frameworks
// Node test runner methods return promises which are not relevant in the context of testing.
// We do ignore them in other places with void keyword.
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.it = nodeTest.it;
// eslint-disable-next-line @typescript-eslint/no-misused-promises
RuleTester.describe = nodeTest.describe;

const ruleTester = new RuleTester();

ruleTester.run('no-empty-catch', rule, {
  valid: [
    'try {} catch (e) { console.log(e); }',
    'try {} catch (e) { \n /* some comment*/ \n console.log(e); }',
    'try {} catch (e) { \n // some comment \n console.log(e); }',
  ],
  invalid: [
    {
      code: 'try {} catch (e) { /* some comment */ }',
      errors: [
        {
          messageId: 'noEmptyCatch',
        },
      ],
    },
    {
      code: 'try {} catch (e) { \n // some comment \n }',
      errors: [
        {
          messageId: 'noEmptyCatch',
        },
      ],
    },
    {
      code: 'try {} catch (e) { }',
      errors: [
        {
          messageId: 'noEmptyCatch',
        },
      ],
    },
  ],
});

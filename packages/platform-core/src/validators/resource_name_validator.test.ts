import { describe, it } from 'node:test';
import { validateResourceName } from './resource_name_validator.js';
import assert from 'node:assert';

void describe('resource name validation', () => {
  const shouldSucceed = [
    'some decent name',
    'Name',
    'something with under_score',
    'numbers 4 in between',
    'ONLY UPPERCASE',
    'with-hyphen',
    'a',
    'a miX of every_thing-in HERE 45',
  ];
  const shouldFail = [
    '34 starting with number',
    '', //empty
    'invalid character %',
  ];
  shouldSucceed.forEach((stringToValidate) => {
    void it(`should validate '${stringToValidate}' successfully`, () => {
      validateResourceName(stringToValidate); // no error thrown
    });
  });
  shouldFail.forEach((stringToValidate) => {
    void it(`should fail to validate '${stringToValidate}'`, () => {
      assert.throws(() => validateResourceName(stringToValidate), {
        message: `Resource name contains invalid characters, found ${stringToValidate}`,
      });
    });
  });
});

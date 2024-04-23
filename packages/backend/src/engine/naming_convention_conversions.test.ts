import { describe, it } from 'node:test';
import { toScreamingSnakeCase } from './naming_convention_conversions.js';
import assert from 'node:assert';

void describe('screaming snake conversions', () => {
  const testCases = [
    { input: 'test', expected: 'TEST' },
    { input: 'TEST', expected: 'TEST' },
    { input: 'TEST_TEST', expected: 'TEST_TEST' },
    { input: 'test_test', expected: 'TEST_TEST' },
    { input: 'test test', expected: 'TEST_TEST' },
    { input: 'test-test', expected: 'TEST_TEST' },
    { input: 'testTest', expected: 'TEST_TEST' },
    { input: 'test3-te3st', expected: 'TEST_3_TE_3_ST' },
    { input: 'test Test_Test-test TEST', expected: 'TEST_TEST_TEST_TEST_TEST' },
  ];
  testCases.forEach((testCase) => {
    void it(`should successfully convert ${testCase.input} to ${testCase.expected}`, () => {
      assert.equal(toScreamingSnakeCase(testCase.input), testCase.expected);
    });
  });
});

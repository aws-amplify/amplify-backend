import * as assert from 'node:assert';
import * as test from 'node:test';
import { format } from './format.js';

void test.describe('format utilities', () => {
  void test.it('should create a list with each line preceded by a dash', () => {
    const lines = ['Item 1', 'Item 2', 'Item 3'];
    const expectedOutput = ' - Item 1\n - Item 2\n - Item 3';
    const actualOutput = format.list(lines);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void test.it(
    'should indent the message with the specified number of spaces',
    () => {
      const message = 'Hello\nWorld';
      const expectedOutput = '  Hello\n  World';
      const actualOutput = format.indent(message, 2);
      assert.strictEqual(actualOutput, expectedOutput);
    }
  );

  void test.it('should not indent the message if the indent value is 0', () => {
    const message = 'Hello\nWorld';
    const expectedOutput = 'Hello\nWorld';
    const actualOutput = format.indent(message, 0);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void test.it(
    'should return the same message if the indent value is negative',
    () => {
      const message = 'Hello\nWorld';
      const expectedOutput = 'Hello\nWorld';
      const actualOutput = format.indent(message, -2);
      assert.strictEqual(actualOutput, expectedOutput);
    }
  );
});

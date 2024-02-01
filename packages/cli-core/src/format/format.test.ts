import * as os from 'node:os';
import * as assert from 'node:assert';
import * as test from 'node:test';
import { format } from './format.js';

void test.describe('format utilities', () => {
  void test.it('should create a list with each line preceded by a dash', () => {
    const lines = ['Item 1', 'Item 2', 'Item 3'];
    const expectedOutput = ` - Item 1${os.EOL} - Item 2${os.EOL} - Item 3`;
    const actualOutput = format.list(lines);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void test.it('should indent the message by two spaces', () => {
    const message = `Hello${os.EOL}World`;
    const expectedOutput = `  Hello${os.EOL}  World`;
    const actualOutput = format.indent(message);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void test.it('should return an empty string when the input is empty', () => {
    const message = '';
    const expectedOutput = '';
    const actualOutput = format.indent(message);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void test.it(
    'should allow chaining indent calls to increase indentation',
    () => {
      const message = `Hello${os.EOL}World`;
      const expectedOutput = `    Hello${os.EOL}    World`;
      const actualOutput = format.indent(format.indent(message));
      assert.strictEqual(actualOutput, expectedOutput);
    }
  );
});

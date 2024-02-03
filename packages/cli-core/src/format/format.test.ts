import * as os from 'node:os';
import * as assert from 'node:assert';
import { describe, it } from 'node:test';
import { format } from './format.js';
import { blue, bold, cyan, underline } from 'kleur/colors';

void describe('format', () => {
  void it('should format amplify command without binary runner', () => {
    const command = 'help';
    const expectedOutput = cyan(`npx amplify help`);
    const actualOutput = format.amplifyCommand(command);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void it('should format amplify command with binary runner', () => {
    const command = 'help';
    const binaryRunner = 'npx';
    const expectedOutput = cyan(`npx amplify help`);
    const actualOutput = format.amplifyCommand(command, binaryRunner);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void it('should return undefined for empty amplify command', () => {
    const command = '';
    const actualOutput = format.amplifyCommand(command);
    assert.strictEqual(actualOutput, undefined);
  });

  void it('should format section header in bold and blue', () => {
    const header = 'Header';
    const expectedOutput = bold(blue(`Header`));
    const actualOutput = format.sectionHeader(header);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void it('should format link in underline and blue', () => {
    const link = 'http://example.com';
    const expectedOutput = underline(blue(`http://example.com`));
    const actualOutput = format.link(link);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void it('should create a list with each line preceded by a dash', () => {
    const lines = ['Item 1', 'Item 2', 'Item 3'];
    const expectedOutput = ` - Item 1${os.EOL} - Item 2${os.EOL} - Item 3`;
    const actualOutput = format.list(lines);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void it('should indent the message by two spaces', () => {
    const message = `Hello${os.EOL}World`;
    const expectedOutput = `  Hello${os.EOL}  World`;
    const actualOutput = format.indent(message);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void it('should return an empty string when the input is empty', () => {
    const message = '';
    const expectedOutput = '';
    const actualOutput = format.indent(message);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void it('should allow chaining indent calls to increase indentation', () => {
    const message = `Hello${os.EOL}World`;
    const expectedOutput = `    Hello${os.EOL}    World`;
    const actualOutput = format.indent(format.indent(message));
    assert.strictEqual(actualOutput, expectedOutput);
  });
});

import * as os from 'node:os';
import * as assert from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { Format, format } from './format.js';
import { $, blue, bold, cyan, green, red, underline } from 'kleur/colors';

void describe('format', () => {
  void it('should format ampx command with yarn', { concurrency: 1 }, () => {
    const formatter = new Format('yarn');
    assert.strictEqual(
      formatter.normalizeAmpxCommand('help'),
      cyan('yarn ampx help')
    );
  });

  void it('should return error for empty ampx command', () => {
    assert.throws(
      () => {
        format.normalizeAmpxCommand('');
      },
      {
        message: 'The command must be non-empty',
      }
    );
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

  void it('should return an error when the input is empty', () => {
    assert.throws(
      () => {
        format.indent('');
      },
      Error,
      'Message cannot be empty'
    );
  });

  void it('should allow chaining indent calls to increase indentation', () => {
    const message = `Hello${os.EOL}World`;
    const expectedOutput = `    Hello${os.EOL}    World`;
    const actualOutput = format.indent(format.indent(message));
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void it('should format success message in green color', () => {
    const message = 'Success message';
    const expectedOutput = green(message);
    const actualOutput = format.success(message);
    assert.strictEqual(actualOutput, expectedOutput);
  });
});

void describe('format.error', async () => {
  void it('should format error message when input is string', () => {
    const input = 'something went wrong';
    const expectedOutput = red(input);
    const actualOutput = format.error(input);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void it('should format error message when input is Error', () => {
    const input = new Error('something went wrong');
    const expectedOutput = red('Error: something went wrong');
    const actualOutput = format.error(input);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void it('should format error message when input is unknown obj', () => {
    const input = {
      message: 'something went wrong',
      code: 1,
    };
    const expectedOutput = red(JSON.stringify(input, null, 2));
    const actualOutput = format.error(input);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void it('should return fallback if input is invalid', () => {
    // JSON.stringify throws for BigInt
    const input = { badValue: 2n };
    const expectedOutput =
      red('Unknown error') +
      os.EOL +
      red('TypeError: Do not know how to serialize a BigInt');
    const actualOutput = format.error(input);
    assert.strictEqual(actualOutput, expectedOutput);
  });

  void it('should recursively print error.cause if present', () => {
    const nestedError = new Error('nested error');
    const input = new Error('something went wrong', { cause: nestedError });
    const expectedOutput =
      red('Error: something went wrong') + os.EOL + red('Error: nested error');
    const actualOutput = format.error(input);
    assert.strictEqual(actualOutput, expectedOutput);
  });
});

void describe('format when terminal colors disabled', async () => {
  // disable color, https://github.com/lukeed/kleur#individual-colors
  before(() => {
    $.enabled = false;
  });

  after(() => {
    $.enabled = true;
  });

  void it('prints plain section header', () => {
    const message = 'Hello';
    const coloredMessage = format.sectionHeader(message);

    assert.strictEqual(
      coloredMessage.includes('\x1b['),
      false,
      'Color codes should not be present'
    );
    assert.strictEqual(coloredMessage, 'Hello');
  });

  void it('prints plain command', () => {
    const message = 'hello';
    const coloredMessage = format.normalizeAmpxCommand(message);

    assert.strictEqual(
      coloredMessage.includes('\x1b['),
      false,
      'Color codes should not be present'
    );
    assert.strictEqual(coloredMessage, 'npx ampx hello');
  });
});

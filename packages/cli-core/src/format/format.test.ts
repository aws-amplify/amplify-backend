import * as os from 'node:os';
import * as assert from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { Format, format } from './format.js';
import { $, blue, bold, cyan, green, underline } from 'kleur/colors';

void describe('format', () => {
  void it('should format amplify command with yarn', { concurrency: 1 }, () => {
    const formatter = new Format('yarn');
    assert.strictEqual(
      formatter.normalizeBackendCommand('help'),
      cyan('yarn amplify help')
    );
  });

  void it('should return error for empty amplify command', () => {
    assert.throws(
      () => {
        format.normalizeBackendCommand('');
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
    const coloredMessage = format.normalizeBackendCommand(message);

    assert.strictEqual(
      coloredMessage.includes('\x1b['),
      false,
      'Color codes should not be present'
    );
    assert.strictEqual(coloredMessage, 'npx amplify hello');
  });
});

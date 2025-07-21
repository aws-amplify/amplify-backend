import assert from 'node:assert';
import { describe, it } from 'node:test';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { extractErrorInfo } from './error_extractor.js';

void describe('Error Extractor', () => {
  void it('extracts info from AmplifyUserError', () => {
    const error = new AmplifyUserError('PathNotFoundError', {
      // eslint-disable-next-line spellcheck/spell-checker
      message: './amplif does not exist.',
      resolution:
        'Make sure you are running this command from your project root directory.',
    });

    const result = extractErrorInfo(error);

    assert.strictEqual(result.name, 'PathNotFoundError');
    // eslint-disable-next-line spellcheck/spell-checker
    assert.strictEqual(result.message, './amplif does not exist.');
    assert.strictEqual(
      result.resolution,
      'Make sure you are running this command from your project root directory.',
    );
  });

  void it('extracts info from regular Error', () => {
    const error = new Error('Something went wrong');
    error.name = 'CustomError';

    const result = extractErrorInfo(error);

    assert.strictEqual(result.name, 'UnknownFault');
    assert.strictEqual(result.message, 'CustomError: Something went wrong');
    assert.strictEqual(result.resolution, undefined);
  });

  void it('handles unknown error types', () => {
    const error = 'String error';

    const result = extractErrorInfo(error);

    assert.strictEqual(result.name, 'UnknownFault');
    assert.strictEqual(
      result.message,
      'An unknown error happened. Check downstream error',
    );
    assert.strictEqual(result.resolution, undefined);
  });
});

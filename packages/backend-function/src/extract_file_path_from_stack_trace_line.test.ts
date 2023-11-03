import { describe, it } from 'node:test';
import { extractFilePathFromStackTraceLine } from './extract_file_path_from_stack_trace_line.js';
import * as assert from 'assert';

void describe('extractFilePathFromStackTraceLine regex', () => {
  // stack trace generated with TS files is of format `at SomeSymbol (C:\\Users\\alias\\some\\path\\src\\fileName.ts:11:11`
  void describe('typescript app', () => {
    void it('matches absolute unix paths', () => {
      const line =
        '    at SomeSymbol (/Users/alias/some/path/src/fileName.ts:28:24)`;';
      const result = line.match(extractFilePathFromStackTraceLine[0]);
      assert.equal(
        result?.groups?.filepath,
        '/Users/alias/some/path/src/fileName.ts'
      );
    });
    void it('matches absolute windows paths', () => {
      const line =
        '    at SomeSymbol (C:\\Users\\alias\\some\\path\\src\\fileName.ts:28:24)`;';
      const result = line.match(extractFilePathFromStackTraceLine[0]);
      assert.equal(
        result?.groups?.filepath,
        'C:\\Users\\alias\\some\\path\\src\\fileName.ts'
      );
    });
    void it('does not match path with colon in middle', () => {
      const line =
        '    at SomeSymbol (/C:\\Users/alias/some/path/src/fileName.ts:28:24)`;';
      const result = line.match(extractFilePathFromStackTraceLine[0]);
      assert.equal(result, null);
    });
  });

  // stack trace generated with JS files is of format `at file:///<filepath>:11:11`
  void describe('javascript app', () => {
    void it('matches absolute unix paths', () => {
      const line =
        '    at file:///Users//alias//some//path//src//fileName.ts:28:24`;';
      const result = line.match(extractFilePathFromStackTraceLine[1]);
      assert.equal(
        result?.groups?.filepath,
        'file:///Users//alias//some//path//src//fileName.ts'
      );
    });
    void it('matches absolute windows paths', () => {
      const line =
        '    at file:\\C:\\Users\\alias\\some\\path\\src\\fileName.ts:28:24`;';
      const result = line.match(extractFilePathFromStackTraceLine[1]);
      assert.equal(
        result?.groups?.filepath,
        'file:\\C:\\Users\\alias\\some\\path\\src\\fileName.ts'
      );
    });
  });
});

import { describe, it } from 'node:test';
import { extractFilePathFromStackTraceLine } from './extract_file_path_from_stack_trace_line.js';
import * as assert from 'assert';

describe('extractFilePathFromStackTraceLine regex', () => {
  it('matches absolute unix paths', () => {
    const line =
      '    at SomeSymbol (/Users/alias/some/path/src/fileName.ts:28:24)`;';
    const result = line.match(extractFilePathFromStackTraceLine);
    assert.equal(
      result?.groups?.filepath,
      '/Users/alias/some/path/src/fileName.ts'
    );
  });
  it('matches absolute windows paths', () => {
    const line =
      '    at SomeSymbol (C:\\Users\\alias\\some\\path\\src\\fileName.ts:28:24)`;';
    const result = line.match(extractFilePathFromStackTraceLine);
    assert.equal(
      result?.groups?.filepath,
      'C:\\Users\\alias\\some\\path\\src\\fileName.ts'
    );
  });
  it('does not match path with colon in middle', () => {
    const line =
      '    at SomeSymbol (/C:\\Users/alias/some/path/src/fileName.ts:28:24)`;';
    const result = line.match(extractFilePathFromStackTraceLine);
    assert.equal(result, null);
  });
});

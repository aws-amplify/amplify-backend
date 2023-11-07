import { describe, it } from 'node:test';
import { FilePathExtractor } from './extract_file_path_from_stack_trace_line.js';
import * as assert from 'assert';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

void describe('extractFilePathFromStackTraceLine regex', () => {
  // stack trace generated with TS files is of format `at SomeSymbol (C:\\Users\\alias\\some\\path\\src\\fileName.ts:11:11`
  void describe('typescript app', () => {
    void it('matches absolute unix paths', () => {
      const line =
        '    at SomeSymbol (/Users/alias/some/path/src/fileName.ts:28:24)`;';
      const result = new FilePathExtractor(line).extract();
      assert.equal(result, '/Users/alias/some/path/src/fileName.ts');
    });
    void it('matches absolute windows paths', () => {
      const line =
        '    at SomeSymbol (C:\\Users\\alias\\some\\path\\src\\fileName.ts:28:24)`;';
      const result = new FilePathExtractor(line).extract();
      assert.equal(result, 'C:\\Users\\alias\\some\\path\\src\\fileName.ts');
    });
    void it('does not match path with invalid path', () => {
      const line = '    at Some garbage;';
      const result = new FilePathExtractor(line).extract();
      assert.equal(result, null);
    });
  });

  // stack trace generated with JS files is of format `at file:///<filepath>:11:11`
  void describe('javascript app', () => {
    const someFileUrl = pathToFileURL('.');
    void it('matches absolute windows paths', () => {
      const line = `    at ${someFileUrl.toString()}/fileName.ts:28:24`;
      const result = new FilePathExtractor(line).extract();
      assert.equal(
        result,
        path.resolve(fileURLToPath(someFileUrl), 'fileName.ts')
      );
    });
  });
});

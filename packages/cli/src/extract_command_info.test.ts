import { describe, it } from 'node:test';
import { Argv } from 'yargs';
import { extractCommandInfo } from './extract_command_info.js';
import assert from 'node:assert';

void describe('extractCommandInfo', () => {
  void it('returns undefined if yargs arguments have not been parsed', () => {
    const parser = {
      parsed: false,
    } as unknown as Argv;
    const actual = extractCommandInfo(parser);
    assert.equal(actual, undefined);
  });

  void it('returns paths and parameters', () => {
    const parser = {
      $0: 'ampx',
      parsed: {
        argv: {
          _: ['subCommand1', 'subCommand2'],
          debug: false, // value is falsy so will be filtered out
          param2: 'bar',
          param1: 'foo',
        },
      },
    } as unknown as Argv;
    const actual = extractCommandInfo(parser);
    assert.deepEqual(actual, {
      path: 'subCommand1 subCommand2',
      parameters: 'param1 param2', // parameters sorted alphabetically
    });
  });
});

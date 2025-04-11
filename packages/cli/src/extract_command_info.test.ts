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

  void it('returns sub commands and options', () => {
    const parser = {
      $0: 'ampx',
      parsed: {
        argv: {
          _: ['subCommand1', 'subCommand2'],
          debug: false, // value is falsy so will be filtered out
          option2: 'bar',
          option1: 'foo',
        },
      },
    } as unknown as Argv;
    const actual = extractCommandInfo(parser);
    assert.deepEqual(actual, {
      subCommands: 'subCommand1 subCommand2',
      options: 'option1 option2', // options sorted alphabetically
    });
  });
});

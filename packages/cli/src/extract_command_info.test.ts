import { describe, it } from 'node:test';
import { Argv } from 'yargs';
import { extractCommandInfo } from './extract_command_info.js';
import assert from 'node:assert';

const canary = 'AMPX_TEST_CANARY_VALUE';

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
          _: ['sandbox', 'delete'],
          $0: 'ampx',
          debug: false, // value is falsy so will be filtered out
          yes: true,
          y: true,
          identifier: 'foo',
        },
      },
    } as unknown as Argv;
    const actual = extractCommandInfo(parser);
    assert.deepEqual(actual, {
      path: ['sandbox', 'delete'],
      parameters: ['identifier', 'y', 'yes'], // parameters sorted alphabetically
    });
  });

  void it('includes camelCase form of declared option names', () => {
    const parser = {
      parsed: {
        argv: {
          _: ['generate', 'outputs'],
          'app-id': 'testAppId',
          appId: 'testAppId',
          'out-dir': 'testDir',
          outDir: 'testDir',
        },
      },
    } as unknown as Argv;
    const actual = extractCommandInfo(parser);
    assert.deepEqual(actual, {
      path: ['generate', 'outputs'],
      parameters: ['app-id', 'appId', 'out-dir', 'outDir'],
    });
  });

  void it('records undeclared positional arguments in command path as placeholder', () => {
    const parser = {
      parsed: {
        argv: {
          _: ['sandbox', 'secret', 'set', canary],
          'secret-name': 'NAME',
          secretName: 'NAME',
        },
      },
    } as unknown as Argv;
    const actual = extractCommandInfo(parser);
    assert.deepEqual(actual, {
      path: ['sandbox', 'secret', 'set', '<unknown>'],
      parameters: ['secret-name', 'secretName'],
    });
  });

  void it('records unknown commands in command path as placeholder', () => {
    const parser = {
      parsed: {
        argv: {
          _: [canary, 'sandbox'],
        },
      },
    } as unknown as Argv;
    const actual = extractCommandInfo(parser);
    assert.deepEqual(actual, {
      path: ['<unknown>', '<unknown>'],
      parameters: [],
    });
  });

  void it('only includes option names declared for the matched command', () => {
    const parser = {
      parsed: {
        argv: {
          _: ['sandbox'],
          identifier: 'foo',
          [canary]: true,
          [`x-${canary}`]: true,
          'app-id': 'declared for other commands only',
          $0: 'ampx',
        },
      },
    } as unknown as Argv;
    const actual = extractCommandInfo(parser);
    assert.deepEqual(actual, {
      path: ['sandbox'],
      parameters: ['identifier'],
    });
  });
});

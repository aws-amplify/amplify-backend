import { describe, it } from 'node:test';
import { Argv } from 'yargs';
import assert from 'node:assert';
import { extractSubCommands } from './extract_sub_commands.js';

const canary = 'AMPX_TEST_CANARY_VALUE';

const createParsedParser = (positionalArgs: Array<string | number>) =>
  ({
    parsed: {
      argv: {
        _: positionalArgs,
      },
    },
  }) as unknown as Argv;

void describe('extractSubCommands', () => {
  void it('returns undefined if yargs arguments have not been parsed', () => {
    const parser = {
      parsed: false,
    } as unknown as Argv;
    assert.equal(extractSubCommands(parser), undefined);
  });

  void it('returns known commands', () => {
    assert.equal(
      extractSubCommands(
        createParsedParser(['configure', 'telemetry', 'disable']),
      ),
      'configure telemetry disable',
    );
    assert.equal(
      extractSubCommands(createParsedParser(['generate', 'outputs'])),
      'generate outputs',
    );
    assert.equal(
      extractSubCommands(createParsedParser(['pipeline-deploy'])),
      'pipeline-deploy',
    );
  });

  void it('records undeclared positional arguments as placeholder', () => {
    assert.equal(
      extractSubCommands(createParsedParser(['generate', 'outputs', canary])),
      'generate outputs <unknown>',
    );
  });

  void it('records unknown command as placeholder', () => {
    assert.equal(extractSubCommands(createParsedParser([canary])), '<unknown>');
    assert.equal(extractSubCommands(createParsedParser([])), '');
  });
});

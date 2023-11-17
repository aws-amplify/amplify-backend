import { Printer } from '@aws-amplify/cli-core';
import { beforeEach, describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import assert from 'node:assert';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import { ConfigureTelemetryCommand } from './configure_telemetry_command.js';
import {
  ConfigController,
  TELEMETRY_ANONYMOUS_ID,
  TELEMETRY_ENABLED_KEY,
} from '@aws-amplify/platform-core';

void describe('configure command', () => {
  const configController = new ConfigController();
  const telemetryCommand = new ConfigureTelemetryCommand(configController);
  const parser = yargs().command(telemetryCommand as unknown as CommandModule);
  const commandRunner = new TestCommandRunner(parser);

  const mockedPrint = mock.method(Printer, 'print');
  const mockedGetAnonymousId = mock.method(
    telemetryCommand,
    'getAnonymousId',
    () => `some_random_id`
  );

  beforeEach(() => {
    mockedPrint.mock.resetCalls();
    mockedGetAnonymousId.mock.resetCalls();
  });

  void it('enable telemetry & updates local config', async () => {
    await commandRunner.runCommand(`telemetry enable`);
    assert.strictEqual(mockedGetAnonymousId.mock.callCount(), 1);
    assert.match(
      mockedPrint.mock.calls[0].arguments[0],
      /You have enabled telemetry data collection/
    );
    assert.equal(configController.get(TELEMETRY_ENABLED_KEY), 'true');
    assert.equal(
      configController.get(TELEMETRY_ANONYMOUS_ID),
      'some_random_id'
    );
  });

  void it('disables telemetry & updates local config', async () => {
    await commandRunner.runCommand(`telemetry disable`);
    assert.strictEqual(mockedGetAnonymousId.mock.callCount(), 0);
    assert.match(
      mockedPrint.mock.calls[0].arguments[0],
      /You have disabled telemetry data collection/
    );
    assert.equal(configController.get(TELEMETRY_ENABLED_KEY), 'false');
    assert.equal(
      configController.get(TELEMETRY_ANONYMOUS_ID),
      'some_random_id'
    );
  });

  void it('if subcommand is not defined, it should list of subcommands and demandCommand', async () => {
    await commandRunner.runCommand(`telemetry`);
    assert.match(
      mockedPrint.mock.calls[0].arguments[0],
      /Not enough non-option arguments: got 0, need at least 1/
    );
  });
});

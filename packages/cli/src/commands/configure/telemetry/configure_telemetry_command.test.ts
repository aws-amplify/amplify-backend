import { Printer } from '@aws-amplify/cli-core';
import { beforeEach, describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import assert from 'node:assert';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import { ConfigureTelemetryCommand } from './configure_telemetry_command.js';
import {
  USAGE_DATA_TRACKING_ENABLED,
  configControllerFactory,
} from '@aws-amplify/platform-core';

void describe('configure command', () => {
  const mockedConfigControllerSet = mock.fn();
  mock.method(configControllerFactory, 'getInstance', () => ({
    set: mockedConfigControllerSet,
  }));
  const telemetryCommand = new ConfigureTelemetryCommand(
    configControllerFactory.getInstance('usage_data_preferences.json')
  );
  const parser = yargs().command(telemetryCommand as unknown as CommandModule);
  const commandRunner = new TestCommandRunner(parser);

  const mockedPrint = mock.method(Printer, 'print');

  beforeEach(() => {
    mockedPrint.mock.resetCalls();
    mockedConfigControllerSet.mock.resetCalls();
  });

  void it('enable telemetry & updates local config', async () => {
    await commandRunner.runCommand(`telemetry enable`);
    assert.match(
      mockedPrint.mock.calls[0].arguments[0],
      /You have enabled telemetry data collection/
    );
    assert.strictEqual(
      mockedConfigControllerSet.mock.calls[0].arguments[0],
      USAGE_DATA_TRACKING_ENABLED
    );
    assert.strictEqual(
      mockedConfigControllerSet.mock.calls[0].arguments[1],
      true
    );
  });

  void it('disables telemetry & updates local config', async () => {
    await commandRunner.runCommand(`telemetry disable`);
    assert.match(
      mockedPrint.mock.calls[0].arguments[0],
      /You have disabled telemetry data collection/
    );
    assert.strictEqual(
      mockedConfigControllerSet.mock.calls[0].arguments[0],
      USAGE_DATA_TRACKING_ENABLED
    );
    assert.strictEqual(
      mockedConfigControllerSet.mock.calls[0].arguments[1],
      false
    );
  });

  void it('if subcommand is not defined, it should list of subcommands and demandCommand', async () => {
    await commandRunner.runCommand(`telemetry`);
    assert.match(
      mockedPrint.mock.calls[0].arguments[0],
      /Not enough non-option arguments: got 0, need at least 1/
    );
    assert.strictEqual(mockedConfigControllerSet.mock.callCount(), 0);
  });
});

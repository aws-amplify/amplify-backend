import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import yargs from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import { ConfigureTelemetryCommand } from './configure_telemetry_command.js';
import {
  USAGE_DATA_TRACKING_ENABLED,
  configControllerFactory,
} from '@aws-amplify/platform-core';
import { printer } from '@aws-amplify/cli-core';

void describe('configure command', () => {
  const mockedConfigControllerSet = mock.fn();
  const logMock = mock.method(printer, 'log');

  mock.method(configControllerFactory, 'getInstance', () => ({
    set: mockedConfigControllerSet,
  }));
  const telemetryCommand = new ConfigureTelemetryCommand(
    configControllerFactory.getInstance('usage_data_preferences.json')
  );
  const parser = yargs().command(telemetryCommand);
  const commandRunner = new TestCommandRunner(parser);

  beforeEach(() => {
    logMock.mock.resetCalls();
    mockedConfigControllerSet.mock.resetCalls();
  });

  void it('enable telemetry & updates local config', async () => {
    await commandRunner.runCommand(`telemetry enable`);
    assert.match(
      logMock.mock.calls[0].arguments[0],
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
      logMock.mock.calls[0].arguments[0],
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

  void it('prints help if subcommand is not provided', async () => {
    const output = await commandRunner.runCommand('telemetry');
    assert.match(output, /Not enough non-option arguments:/);
  });
});

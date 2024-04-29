import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import yargs from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import { ConfigureTelemetryCommand } from './configure_telemetry_command.js';
import {
  USAGE_DATA_TRACKING_ENABLED,
  UsageDataEmitter,
  configControllerFactory,
} from '@aws-amplify/platform-core';
import { printer } from '@aws-amplify/cli-core';

void describe('configure command', () => {
  const mockedConfigControllerSet = mock.fn();
  const logMock = mock.method(printer, 'log');
  const emitFailureMock = mock.fn<UsageDataEmitter['emitFailure']>(() =>
    Promise.resolve()
  );
  const emitSuccessMock = mock.fn<UsageDataEmitter['emitSuccess']>(() =>
    Promise.resolve()
  );

  mock.method(configControllerFactory, 'getInstance', () => ({
    set: mockedConfigControllerSet,
  }));
  const telemetryCommand = new ConfigureTelemetryCommand(
    configControllerFactory.getInstance('usage_data_preferences.json')
  );
  const parser = yargs().command(telemetryCommand);
  const commandRunner = new TestCommandRunner(parser, {
    emitSuccess: emitSuccessMock,
    emitFailure: emitFailureMock,
  });

  beforeEach(() => {
    logMock.mock.resetCalls();
    mockedConfigControllerSet.mock.resetCalls();
    emitSuccessMock.mock.resetCalls();
    emitFailureMock.mock.resetCalls();
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
    assert.equal(emitFailureMock.mock.callCount(), 0);
    assert.equal(emitSuccessMock.mock.callCount(), 1);
    assert.deepStrictEqual(emitSuccessMock.mock.calls[0].arguments[1], {
      command: 'telemetry enable',
    });
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
    assert.equal(emitFailureMock.mock.callCount(), 0);
    assert.equal(emitSuccessMock.mock.callCount(), 1);
    assert.deepStrictEqual(emitSuccessMock.mock.calls[0].arguments[1], {
      command: 'telemetry disable',
    });
  });

  void it('if subcommand is not defined, it should list of subcommands and demandCommand', async () => {
    const output = await commandRunner.runCommand(`telemetry`);
    assert.match(
      output,
      /Not enough non-option arguments: got 0, need at least 1/
    );
    assert.strictEqual(mockedConfigControllerSet.mock.callCount(), 0);
    assert.equal(emitFailureMock.mock.callCount(), 1);
    assert.match(
      emitFailureMock.mock.calls[0].arguments[0].message,
      /Not enough non-option arguments: got 0, need at least 1/
    );
    assert.deepStrictEqual(emitFailureMock.mock.calls[0].arguments[1], {
      command: 'telemetry',
    });
  });
});

import { describe, it, mock } from 'node:test';
import { createInfoCommand } from './info_command_factory.js';
import { InfoCommand } from './info_command.js';
import { EnvironmentInfoProvider } from '../../info/env_info.js';
import { CdkInfoProvider } from '../../info/cdk_info.js';
import { TestCommandRunner } from '../../test-utils/command_runner.js';
import assert from 'node:assert';
import yargs from 'yargs';

void describe('createInfoCommand', () => {
  void it('should return an instance of InfoCommand', () => {
    const result = createInfoCommand();
    assert.ok(result instanceof InfoCommand);
  });
});

void describe('info command run', () => {
  const command = createInfoCommand();
  const parser = yargs().command(command);
  const commandRunner = new TestCommandRunner(parser);

  void it('includes info subcommands in help output', async () => {
    const output = await commandRunner.runCommand(['info', '--help']);
    assert.match(
      output,
      /info\W*Generates information for Amplify troubleshooting/
    );
  });

  void it('handles command run', async () => {
    const environmentInfoProviderMock = new EnvironmentInfoProvider();
    const cdkInfoProviderMock = new CdkInfoProvider();

    const infoMock = mock.method(
      environmentInfoProviderMock,
      'getEnvInfo',
      async () => ({})
    );
    const infoFormatterMock = mock.method(
      environmentInfoProviderMock,
      'formatEnvInfo',
      () => ''
    );
    const cdkInfoMock = mock.method(
      cdkInfoProviderMock,
      'getCdkInfo',
      async () => ''
    );
    const cdkFormatterMock = mock.method(
      cdkInfoProviderMock,
      'formatCdkInfo',
      () => ''
    );

    const command = new InfoCommand(
      environmentInfoProviderMock,
      cdkInfoProviderMock
    );
    const parser = yargs().command(command);
    const commandRunner = new TestCommandRunner(parser);
    await commandRunner.runCommand(['info']);

    assert.equal(infoMock.mock.callCount(), 1);
    assert.equal(infoFormatterMock.mock.callCount(), 1);
    assert.equal(cdkInfoMock.mock.callCount(), 1);
    assert.equal(cdkFormatterMock.mock.callCount(), 1);
  });
});

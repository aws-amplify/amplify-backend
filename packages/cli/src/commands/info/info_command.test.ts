import * as os from 'node:os';
import { describe, it, mock } from 'node:test';
import { createInfoCommand } from './info_command_factory.js';
import { InfoCommand } from './info_command.js';
import { EnvironmentInfoProvider } from '../../info/env_info.js';
import { CdkInfoProvider } from '../../info/cdk_info.js';
import { TestCommandRunner } from '../../test-utils/command_runner.js';
import { printer } from '../../printer.js';
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

  void it('test info command run', async () => {
    const environmentInfoProviderMock = new EnvironmentInfoProvider();
    const cdkInfoProviderMock = new CdkInfoProvider();

    const cdkMockValue = `
    AWS environment variables:
      AWS_STS_REGIONAL_ENDPOINTS = regional
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = 1
      AWS_SDK_LOAD_CONFIG = 1
    CDK environment variables:
      CDK_DEBUG = true
      CDK_DISABLE_VERSION_CHECK = true
    `;

    const environmentInfoMockValue = `
    System:
      CPU: fake
      Memory: fake
      OS: fakeOS
      Shell: /fake/path
    Binaries:
      Node: 0.0.0 - /fake/path
      npm: 0.0.0 - /fake/path
      pnpm: 0.0.0 - /fake/path
      Yarn: 0.0.0 - /fake/path
    NPM Packages:
      fake: 0.0.0
      `;

    const infoMock = mock.method(
      environmentInfoProviderMock,
      'getEnvInfo',
      async () => ''
    );
    const infoFormatterMock = mock.method(
      environmentInfoProviderMock,
      'formatEnvInfo',
      () => environmentInfoMockValue
    );
    const cdkInfoMock = mock.method(
      cdkInfoProviderMock,
      'getCdkInfo',
      async () => ''
    );
    const cdkFormatterMock = mock.method(
      cdkInfoProviderMock,
      'formatCdkInfo',
      () => cdkMockValue
    );

    const mockPrinter = mock.method(printer, 'print', () => ({}));

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
    assert.equal(mockPrinter.mock.callCount(), 1);
    assert.strictEqual(
      mockPrinter.mock.calls[0].arguments[0],
      `${environmentInfoMockValue}${os.EOL}${cdkMockValue}`
    );
  });
});

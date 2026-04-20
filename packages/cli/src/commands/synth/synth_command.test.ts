import { beforeEach, describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../test-utils/command_runner.js';
import assert from 'node:assert';
import path from 'node:path';
import { SynthCommand, SynthCommandOptions } from './synth_command.js';
import {
  BackendDeployerFactory,
  BackendDeployerOutputFormatter,
} from '@aws-amplify/backend-deployer';
import {
  LogLevel,
  PackageManagerControllerFactory,
  Printer,
} from '@aws-amplify/cli-core';
import { AmplifyIOHost } from '@aws-amplify/plugin-types';

void describe('synth command', () => {
  const mockIoHost: AmplifyIOHost = {
    notify: mock.fn(),
    requestResponse: mock.fn(),
  };
  const mockProfileResolver = mock.fn();

  const packageManagerControllerFactory = new PackageManagerControllerFactory(
    process.cwd(),
    new Printer(LogLevel.DEBUG),
  );
  const formatterStub: BackendDeployerOutputFormatter = {
    normalizeAmpxCommand: () => 'test command',
  };

  const mockFsCopyDir = mock.fn<(src: string, dest: string) => Promise<void>>(
    () => Promise.resolve(),
  );

  const getCommandRunner = () => {
    const backendDeployerFactory = new BackendDeployerFactory(
      packageManagerControllerFactory.getPackageManagerController(),
      formatterStub,
      mockIoHost,
      mockProfileResolver,
    );
    const backendDeployer = backendDeployerFactory.getInstance();
    const synthCommand = new SynthCommand(
      backendDeployer,
      mockFsCopyDir,
    ) as CommandModule<object, SynthCommandOptions>;
    const parser = yargs().command(synthCommand);
    return new TestCommandRunner(parser);
  };

  beforeEach(() => {
    mockFsCopyDir.mock.resetCalls();
  });

  void it('shows the command description with --help', async () => {
    const output = await getCommandRunner().runCommand('--help');
    assert.match(output, /Commands:/);
    assert.match(
      output,
      /Synthesizes CloudFormation templates without deploying/,
    );
  });

  void it('fails if required --branch argument is not supplied', async () => {
    const output = await getCommandRunner().runCommand(
      'synth --app-id test-app-id',
    );
    assert.match(output, /Missing required argument/);
  });

  void it('fails if required --app-id argument is not supplied', async () => {
    const output = await getCommandRunner().runCommand(
      'synth --branch test-branch',
    );
    assert.match(output, /Missing required argument/);
  });

  void it('executes backend deployer synth with branch and app-id', async () => {
    const backendDeployerFactory = new BackendDeployerFactory(
      packageManagerControllerFactory.getPackageManagerController(),
      formatterStub,
      mockIoHost,
      mockProfileResolver,
    );
    const mockSynth = mock.method(
      backendDeployerFactory.getInstance(),
      'synth',
      () =>
        Promise.resolve({
          deploymentTimes: { synthesisTime: 1, totalTime: 1 },
          cloudAssemblyPath: '/tmp/test-cdk-out',
        }),
    );
    await getCommandRunner().runCommand(
      'synth --branch test-branch --app-id test-app-id',
    );
    assert.strictEqual(mockSynth.mock.callCount(), 1);
    assert.deepStrictEqual(mockSynth.mock.calls[0].arguments, [
      {
        name: 'test-branch',
        namespace: 'test-app-id',
        type: 'branch',
      },
      {
        validateAppSources: true,
      },
    ]);
    assert.strictEqual(mockFsCopyDir.mock.callCount(), 1);
    assert.strictEqual(
      mockFsCopyDir.mock.calls[0].arguments[0],
      '/tmp/test-cdk-out',
    );
  });

  void it('executes backend deployer synth with branch and custom app-id', async () => {
    const backendDeployerFactory = new BackendDeployerFactory(
      packageManagerControllerFactory.getPackageManagerController(),
      formatterStub,
      mockIoHost,
      mockProfileResolver,
    );
    const mockSynth = mock.method(
      backendDeployerFactory.getInstance(),
      'synth',
      () =>
        Promise.resolve({
          deploymentTimes: { synthesisTime: 1, totalTime: 1 },
          cloudAssemblyPath: '/tmp/test-cdk-out',
        }),
    );
    await getCommandRunner().runCommand(
      'synth --branch test-branch --app-id my-app',
    );
    assert.strictEqual(mockSynth.mock.callCount(), 1);
    assert.deepStrictEqual(mockSynth.mock.calls[0].arguments, [
      {
        name: 'test-branch',
        namespace: 'my-app',
        type: 'branch',
      },
      {
        validateAppSources: true,
      },
    ]);
    assert.strictEqual(mockFsCopyDir.mock.callCount(), 1);
  });

  void it('allows --out argument', async () => {
    const backendDeployerFactory = new BackendDeployerFactory(
      packageManagerControllerFactory.getPackageManagerController(),
      formatterStub,
      mockIoHost,
      mockProfileResolver,
    );
    const mockSynth = mock.method(
      backendDeployerFactory.getInstance(),
      'synth',
      () =>
        Promise.resolve({
          deploymentTimes: { synthesisTime: 1, totalTime: 1 },
          cloudAssemblyPath: '/tmp/test-cdk-out',
        }),
    );
    await getCommandRunner().runCommand(
      'synth --branch test-branch --app-id test-app-id --out ./my-output',
    );
    assert.strictEqual(mockSynth.mock.callCount(), 1);
    assert.strictEqual(mockFsCopyDir.mock.callCount(), 1);
    assert.strictEqual(
      mockFsCopyDir.mock.calls[0].arguments[0],
      '/tmp/test-cdk-out',
    );
    assert.strictEqual(
      mockFsCopyDir.mock.calls[0].arguments[1],
      path.resolve('./my-output'),
    );
  });

  void it('throws when --branch argument has no input', async () => {
    await assert.rejects(
      async () =>
        await getCommandRunner().runCommand(
          'synth --branch --app-id test-app-id',
        ),
      (error: TestCommandError) => {
        assert.strictEqual(error.error.name, 'InvalidCommandInputError');
        assert.strictEqual(error.error.message, 'Invalid --branch');
        return true;
      },
    );
  });

  void it('throws when --app-id argument is empty string', async () => {
    await assert.rejects(
      async () =>
        await getCommandRunner().runCommand([
          'synth',
          '--app-id',
          '',
          '--branch',
          'testBranch',
        ]),
      (error: TestCommandError) => {
        assert.strictEqual(error.error.name, 'InvalidCommandInputError');
        assert.strictEqual(error.error.message, 'Invalid --app-id');
        return true;
      },
    );
  });
});

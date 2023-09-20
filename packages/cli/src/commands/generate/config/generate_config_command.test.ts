import { beforeEach, describe, it, mock } from 'node:test';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { GenerateConfigCommand } from './generate_config_command.js';
import { ClientConfigFormat } from '@aws-amplify/client-config/paths';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import path from 'path';
import { ClientConfigGeneratorAdapter } from './client_config_generator_adapter.js';

describe('generate config command', () => {
  const configFileName = 'amplifyconfiguration';
  const clientConfigGeneratorAdapter = new ClientConfigGeneratorAdapter(
    fromNodeProviderChain()
  );

  const generateClientConfigMock = mock.method(
    clientConfigGeneratorAdapter,
    'generateClientConfigToFile',
    () => Promise.resolve()
  );

  const generateConfigCommand = new GenerateConfigCommand(
    clientConfigGeneratorAdapter,
    { resolve: () => Promise.resolve('testAppName') }
  );
  const parser = yargs().command(
    generateConfigCommand as unknown as CommandModule
  );
  const commandRunner = new TestCommandRunner(parser);

  beforeEach(() => {
    generateClientConfigMock.mock.resetCalls();
  });

  it('generates and writes config for stack', async () => {
    await commandRunner.runCommand(
      'config --stack stack_name --out /foo/bar --format ts'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
    });
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(
      generateClientConfigMock.mock.calls[0].arguments[1],
      '/foo/bar'
    );
  });

  it('generates and writes config for branch', async () => {
    await commandRunner.runCommand(
      'config --branch branch_name --out /foo/bar --format ts'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      appName: 'testAppName',
      branchName: 'branch_name',
    });
    // I can't find any open node:test or yargs issues that would explain why this is necessary
    // but for some reason the mock call count does not update without this 0ms wait
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[2],
      ClientConfigFormat.TS
    );
  });

  it('generates and writes config for appID and branch', async () => {
    await commandRunner.runCommand(
      'config --branch branch_name --appId app_id --out /foo/bar --format js'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      backendId: 'app_id',
      branchName: 'branch_name',
    });
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[1],
      '/foo/bar'
    );
  });

  it('can generate to custom absolute path', async () => {
    await commandRunner.runCommand(
      'config --stack stack_name --out /foo/bar --format ts'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
    });
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.equal(
      generateClientConfigMock.mock.calls[0].arguments[1],
      path.join('/', 'foo', 'bar')
    );
  });

  it('can generate to custom relative path', async () => {
    await commandRunner.runCommand(
      'config --stack stack_name --out foo/bar --format js'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
    });
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.equal(generateClientConfigMock.mock.calls[0].arguments[2], 'js');
  });

  it('shows available options in help output', async () => {
    const output = await commandRunner.runCommand('config --help');
    assert.match(output, /--stack/);
    assert.match(output, /--appId/);
    assert.match(output, /--branch/);
    assert.match(output, /--format/);
    assert.match(output, /--out/);
  });

  it('fails if both stack and branch are present', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('config --stack foo --branch baz'),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'YError');
        assert.match(err.error.message, /Arguments .* mutually exclusive/);
        assert.match(err.output, /Arguments .* are mutually exclusive/);
        return true;
      }
    );
  });
});

import { beforeEach, describe, it, mock } from 'node:test';
import { ClientConfigGeneratorAdapter } from './client_config_generator_adapter.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ClientConfigWriter } from './client_config_writer.js';
import { GenerateConfigCommand } from './generate_config_command.js';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../../test_utils/command_runner.js';
import assert from 'node:assert';
import path from 'path';
import { ClientConfig } from '@aws-amplify/backend-engine/client-config-generator';

describe('generate config command', () => {
  const clientConfigGeneratorAdapter = new ClientConfigGeneratorAdapter(
    fromNodeProviderChain()
  );
  const clientConfig: ClientConfig = {
    Auth: {
      userPoolId: 'something',
    },
  };
  const generateClientConfigMock = mock.method(
    clientConfigGeneratorAdapter,
    'generateClientConfig',
    () => {
      return Promise.resolve(clientConfig);
    }
  );
  const clientConfigWriter = new ClientConfigWriter();
  const writeClientConfigMock = mock.method(
    clientConfigWriter,
    'writeClientConfig',
    () => {
      // no op
    }
  );

  const generateConfigCommand = new GenerateConfigCommand(
    clientConfigGeneratorAdapter,
    clientConfigWriter
  );
  const parser = yargs().command(
    generateConfigCommand as unknown as CommandModule
  );
  const commandRunner = new TestCommandRunner(parser);

  beforeEach(() => {
    generateClientConfigMock.mock.resetCalls();
    writeClientConfigMock.mock.resetCalls();
  });

  it('generates and writes config for stack', async () => {
    await commandRunner.runCommand('config --stack stack_name');
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
    });
    assert.equal(writeClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(
      writeClientConfigMock.mock.calls[0].arguments[0],
      clientConfig
    );
    assert.equal(
      writeClientConfigMock.mock.calls[0].arguments[1],
      path.join(process.cwd(), 'amplifyconfiguration.json')
    );
  });

  it('generates and writes config for project and branch', async () => {
    await commandRunner.runCommand(
      'config --project project_name --branch branch_name'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      projectName: 'project_name',
      environmentName: 'branch_name',
    });
    assert.equal(writeClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(
      writeClientConfigMock.mock.calls[0].arguments[0],
      clientConfig
    );
    assert.equal(
      writeClientConfigMock.mock.calls[0].arguments[1],
      path.join(process.cwd(), 'amplifyconfiguration.json')
    );
  });

  it('can generate to custom directory', async () => {
    await commandRunner.runCommand('config --stack stack_name --out /foo/bar');
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
    });
    assert.equal(writeClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(
      writeClientConfigMock.mock.calls[0].arguments[0],
      clientConfig
    );
    assert.equal(
      writeClientConfigMock.mock.calls[0].arguments[1],
      path.join('/foo/bar', 'amplifyconfiguration.json')
    );
  });

  it('shows available options in help output', async () => {
    const output = await commandRunner.runCommand('config --help');
    assert.match(output, /--stack/);
    assert.match(output, /--project/);
    assert.match(output, /--branch/);
    assert.match(output, /--out/);
  });

  it('fails if both stack and project,branch are present', async () => {
    await assert.rejects(
      () =>
        commandRunner.runCommand(
          'config --stack foo --project bar --branch baz'
        ),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'YError');
        assert.match(err.error.message, /Arguments .* mutually exclusive/);
        assert.match(err.output, /Arguments .* are mutually exclusive/);
        return true;
      }
    );
  });

  it('fails if only branch is provided', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('config --branch foo'),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'YError');
        assert.match(err.output, /Missing dependent arguments:/);
        return true;
      }
    );
  });

  it('fails if only project is provided', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('config --project foo'),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'YError');
        assert.match(err.output, /Missing dependent arguments:/);
        return true;
      }
    );
  });
});

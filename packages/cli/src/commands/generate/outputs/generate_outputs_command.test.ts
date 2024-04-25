import { beforeEach, describe, it, mock } from 'node:test';
import { GenerateOutputsCommand } from './generate_outputs_command.js';
import { ClientConfigFormat } from '@aws-amplify/client-config';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { AppBackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { ClientConfigGeneratorAdapter } from '../../../client-config/client_config_generator_adapter.js';
import { BackendIdentifierResolverWithFallback } from '../../../backend-identifier/backend_identifier_with_sandbox_fallback.js';
import { SandboxBackendIdResolver } from '../../sandbox/sandbox_id_resolver.js';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

void describe('generate outputs command', () => {
  const clientConfigGeneratorAdapter = new ClientConfigGeneratorAdapter({
    getS3Client: () => new S3Client(),
    getAmplifyClient: () => new AmplifyClient(),
    getCloudFormationClient: () => new CloudFormationClient(),
  });

  const generateClientConfigMock = mock.method(
    clientConfigGeneratorAdapter,
    'generateClientConfigToFile',
    () => Promise.resolve()
  );

  const namespaceResolver = {
    resolve: () => Promise.resolve('testAppName'),
  };

  const defaultResolver = new AppBackendIdentifierResolver(namespaceResolver);

  const sandboxIdResolver = new SandboxBackendIdResolver(namespaceResolver);
  const fakeSandboxId = 'my-fake-app-my-fake-username';
  const mockedSandboxIdResolver = mock.method(sandboxIdResolver, 'resolve');
  mockedSandboxIdResolver.mock.mockImplementation(() => fakeSandboxId);

  const backendIdResolver = new BackendIdentifierResolverWithFallback(
    defaultResolver,
    sandboxIdResolver
  );

  const generateOutputsCommand = new GenerateOutputsCommand(
    clientConfigGeneratorAdapter,
    backendIdResolver
  );
  const parser = yargs().command(
    generateOutputsCommand as unknown as CommandModule
  );
  const commandRunner = new TestCommandRunner(parser);

  beforeEach(() => {
    generateClientConfigMock.mock.resetCalls();
  });

  void it('uses the sandbox id by default if stack or branch are not provided', async () => {
    const handlerSpy = mock.method(
      clientConfigGeneratorAdapter,
      'generateClientConfigToFile'
    );
    await commandRunner.runCommand('outputs');

    assert.equal(handlerSpy.mock.calls[0].arguments[0], fakeSandboxId);
  });

  void it('generates and writes config for stack', async () => {
    await commandRunner.runCommand(
      'outputs --stack stack_name --out-dir /foo/bar --format ts'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
    });
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(
      generateClientConfigMock.mock.calls[0].arguments[1],
      '0' // default version
    );
    assert.deepEqual(
      generateClientConfigMock.mock.calls[0].arguments[2],
      '/foo/bar'
    );
    assert.deepEqual(
      generateClientConfigMock.mock.calls[0].arguments[3],
      ClientConfigFormat.TS
    );
  });

  void it('generates and writes config for branch', async () => {
    await commandRunner.runCommand(
      'outputs --branch branch_name --out-dir /foo/bar --format ts'
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
    assert.deepEqual(
      generateClientConfigMock.mock.calls[0].arguments[1],
      '0' // default version
    );
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[2],
      '/foo/bar'
    );
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments[3],
      ClientConfigFormat.TS
    );
  });

  void it('generates and writes config for appID and branch', async () => {
    await commandRunner.runCommand(
      'outputs --branch branch_name --app-id app_id --out-dir /foo/bar --format mjs'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments.splice(0, 4),
      [
        {
          name: 'branch_name',
          namespace: 'app_id',
          type: 'branch',
        },
        '0',
        '/foo/bar',
        ClientConfigFormat.MJS,
      ]
    );
  });

  void it('can generate to custom absolute path', async () => {
    await commandRunner.runCommand(
      'outputs --stack stack_name --out-dir /foo/bar --format ts'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments.splice(0, 4),
      [
        {
          stackName: 'stack_name',
        },
        '0',
        '/foo/bar',
        ClientConfigFormat.TS,
      ]
    );
  });

  void it('can generate to custom relative path', async () => {
    await commandRunner.runCommand(
      'outputs --stack stack_name --out-dir foo/bar --format mjs'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments.splice(0, 4),
      [
        {
          stackName: 'stack_name',
        },
        '0',
        'foo/bar',
        ClientConfigFormat.MJS,
      ]
    );
  });

  void it('can generate outputs in dart format', async () => {
    await commandRunner.runCommand(
      'outputs --stack stack_name --out-dir foo/bar --format dart'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments.splice(0, 4),
      [
        {
          stackName: 'stack_name',
        },
        '0',
        'foo/bar',
        ClientConfigFormat.DART,
      ]
    );
  });

  void it('can generate outputs in json mobile format', async () => {
    await commandRunner.runCommand(
      'outputs --stack stack_name --out-dir foo/bar --format json-mobile'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments.splice(0, 4),
      [
        {
          stackName: 'stack_name',
        },
        '0',
        'foo/bar',
        ClientConfigFormat.JSON_MOBILE,
      ]
    );
  });

  void it('can generate outputs in with a different version', async () => {
    await commandRunner.runCommand(
      'outputs --stack stack_name --config-version 1 --out-dir foo/bar --format json-mobile'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      generateClientConfigMock.mock.calls[0].arguments.splice(0, 4),
      [
        {
          stackName: 'stack_name',
        },
        '1',
        'foo/bar',
        ClientConfigFormat.JSON_MOBILE,
      ]
    );
  });

  void it('shows available options in help output', async () => {
    const output = await commandRunner.runCommand('outputs --help');
    assert.match(output, /--stack/);
    assert.match(output, /--app-id/);
    assert.match(output, /--branch/);
    assert.match(output, /--format/);
    assert.match(output, /--out-dir/);
  });

  void it('fails if both stack and branch are present', async () => {
    const output = await commandRunner.runCommand(
      'outputs --stack foo --branch baz'
    );
    assert.match(output, /Arguments .* mutually exclusive/);
  });
});

import { beforeEach, describe, it, mock } from 'node:test';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { GenerateGraphqlClientCodeCommand } from './generate_graphql_client_code_command.js';
import yargs, { CommandModule } from 'yargs';
import {
  TestCommandError,
  TestCommandRunner,
} from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import path from 'path';
import { GraphqlClientCodeGeneratorAdapter } from './generate_graphql_client_code_generator_adapter.js';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';

describe('generate graphql-client-code command', () => {
  const graphqlClientCodeGeneratorAdapter =
    new GraphqlClientCodeGeneratorAdapter(fromNodeProviderChain());

  const generateClientConfigMock = mock.method(
    graphqlClientCodeGeneratorAdapter,
    'generateGraphqlClientCodeToFile',
    () => Promise.resolve()
  );

  const backendIdentifierResolver = new BackendIdentifierResolver({
    resolve: () => Promise.resolve('testAppName'),
  });
  const generateGraphqlClientCodeCommand = new GenerateGraphqlClientCodeCommand(
    graphqlClientCodeGeneratorAdapter,
    backendIdentifierResolver
  );
  const parser = yargs().command(
    generateGraphqlClientCodeCommand as unknown as CommandModule
  );
  const commandRunner = new TestCommandRunner(parser);

  beforeEach(() => {
    generateClientConfigMock.mock.resetCalls();
  });

  it('generates and writes graphql client code for stack', async () => {
    await commandRunner.runCommand('graphql-client-code --stack stack_name');
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      backendIdentifier: {
        stackName: 'stack_name',
      },
      format: 'graphql-codegen',
      out: process.cwd(),
      statementTarget: 'javascript',
    });
  });

  it('generates and writes graphql client code for branch', async () => {
    await commandRunner.runCommand('graphql-client-code --branch branch_name');
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      backendIdentifier: {
        appName: 'testAppName',
        branchName: 'branch_name',
      },
      out: process.cwd(),
      format: 'graphql-codegen',
      statementTarget: 'javascript',
    });
  });

  it('generates and writes graphql client code for appID and branch', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --branch branch_name --appId app_id'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      backendIdentifier: {
        backendId: 'app_id',
        branchName: 'branch_name',
      },
      out: process.cwd(),
      format: 'graphql-codegen',
      statementTarget: 'javascript',
    });
  });

  it('can generate to custom relative path', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --out foo/bar'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      backendIdentifier: {
        stackName: 'stack_name',
      },
      format: 'graphql-codegen',
      statementTarget: 'javascript',
      out: path.join(process.cwd(), 'foo', 'bar'),
    });
  });

  it('shows available options in help output', async () => {
    const output = await commandRunner.runCommand('graphql-client-code --help');
    assert.match(output, /--stack/);
    assert.match(output, /--appId/);
    assert.match(output, /--branch/);
    assert.match(output, /--format/);
    assert.match(output, /--statementTarget/);
    assert.match(output, /--typeTarget/);
    assert.match(output, /--modelTarget/);
    assert.match(output, /--out/);
  });

  it('can be invoked explicitly with graphql-codegen format', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format graphql-codegen'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      backendIdentifier: {
        stackName: 'stack_name',
      },
      format: 'graphql-codegen',
      statementTarget: 'javascript',
      out: process.cwd(),
    });
  });

  it('can be invoked explicitly with modelgen format', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format modelgen'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      backendIdentifier: {
        stackName: 'stack_name',
      },
      format: 'modelgen',
      modelTarget: 'javascript',
      out: process.cwd(),
    });
  });

  it('can be invoked explicitly with introspection format', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format introspection'
    );
    assert.equal(generateClientConfigMock.mock.callCount(), 1);
    assert.deepEqual(generateClientConfigMock.mock.calls[0].arguments[0], {
      backendIdentifier: {
        stackName: 'stack_name',
      },
      format: 'introspection',
      out: process.cwd(),
    });
  });

  // Note: after this test, future tests seem to be in a weird state, leaving this at the
  it('fails if both stack and branch are present', async () => {
    await assert.rejects(
      () =>
        commandRunner.runCommand(
          'graphql-client-code --stack foo --branch baz'
        ),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'YError');
        assert.match(err.error.message, /Arguments .* mutually exclusive/);
        assert.match(err.output, /Arguments .* are mutually exclusive/);
        return true;
      }
    );
  });
});

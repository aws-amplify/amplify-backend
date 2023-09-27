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
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { GenerateApiCodeAdapter } from './generate_api_code_adapter.js';
import {
  GenerateApiCodeFormat,
  GenerateApiCodeModelTarget,
  GenerateApiCodeStatementTarget,
} from '@aws-amplify/model-generator';

void describe('generate graphql-client-code command', () => {
  const generateApiCodeAdapter = new GenerateApiCodeAdapter(
    fromNodeProviderChain()
  );

  const writeToDirectoryMock = mock.fn();
  const invokeGenerateApiCodeMock = mock.method(
    generateApiCodeAdapter,
    'invokeGenerateApiCode',
    () =>
      Promise.resolve({
        writeToDirectory: writeToDirectoryMock,
      })
  );

  const backendIdentifierResolver = new BackendIdentifierResolver({
    resolve: () => Promise.resolve('testAppName'),
  });
  const generateGraphqlClientCodeCommand = new GenerateGraphqlClientCodeCommand(
    generateApiCodeAdapter,
    backendIdentifierResolver
  );
  const parser = yargs().command(
    generateGraphqlClientCodeCommand as unknown as CommandModule
  );
  const commandRunner = new TestCommandRunner(parser);

  beforeEach(() => {
    invokeGenerateApiCodeMock.mock.resetCalls();
    writeToDirectoryMock.mock.resetCalls();
  });

  void it('generates and writes graphql client code for stack', async () => {
    await commandRunner.runCommand('graphql-client-code --stack stack_name');
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget: GenerateApiCodeStatementTarget.JAVASCRIPT,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  void it('generates and writes graphql client code for branch', async () => {
    await commandRunner.runCommand('graphql-client-code --branch branch_name');
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      appName: 'testAppName',
      branchName: 'branch_name',
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget: GenerateApiCodeStatementTarget.JAVASCRIPT,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  void it('generates and writes graphql client code for appID and branch', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --branch branch_name --appId app_id'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      backendId: 'app_id',
      disambiguator: 'branch_name',
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget: GenerateApiCodeStatementTarget.JAVASCRIPT,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  void it('can generate to custom relative path', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --out foo/bar'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget: GenerateApiCodeStatementTarget.JAVASCRIPT,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      path.join(process.cwd(), 'foo', 'bar')
    );
  });

  void it('shows available options in help output', async () => {
    const output = await commandRunner.runCommand('graphql-client-code --help');
    assert.match(output, /--stack/);
    assert.match(output, /--appId/);
    assert.match(output, /--branch/);
    assert.match(output, /--format/);
    assert.match(output, /--statementTarget/);
    assert.match(output, /--typeTarget/);
    assert.match(output, /--modelTarget/);
    assert.match(output, /--out/);
    assert.match(output, /--all/);
  });

  void it('shows all available options in help output', async () => {
    const output = await commandRunner.runCommand(
      'graphql-client-code --help --all'
    );
    assert.match(output, /--stack/);
    assert.match(output, /--appId/);
    assert.match(output, /--branch/);
    assert.match(output, /--format/);
    assert.match(output, /--statementTarget/);
    assert.match(output, /--typeTarget/);
    assert.match(output, /--modelTarget/);
    assert.match(output, /--out/);
    assert.match(output, /--all/);
    assert.match(output, /--modelGenerateIndexRules/);
    assert.match(output, /--modelEmitAuthProvider/);
    assert.match(output, /--modelAddTimestampFields/);
    assert.match(output, /--statementMaxDepth/);
    assert.match(output, /--statementTypenameIntrospection/);
    assert.match(output, /--typeMultipleSwiftFiles/);
  });

  void it('can be invoked explicitly with graphql-codegen format', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format graphql-codegen'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget: GenerateApiCodeStatementTarget.JAVASCRIPT,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  void it('can be invoked explicitly with modelgen format', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format modelgen'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.MODELGEN,
      modelTarget: GenerateApiCodeModelTarget.JAVASCRIPT,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  void it('can be invoked explicitly with introspection format', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format introspection'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.INTROSPECTION,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  void it('passes in feature flags on modelgen', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format modelgen --modelGenerateIndexRules true --modelEmitAuthProvider true --modelGenerateModelsForLazyLoadAndCustomSelectionSet false'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.MODELGEN,
      modelTarget: GenerateApiCodeModelTarget.JAVASCRIPT,
      generateIndexRules: true,
      emitAuthProvider: true,
      generateModelsForLazyLoadAndCustomSelectionSet: false,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  void it('passes in feature flags on graphql-codegen', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format graphql-codegen --statementTarget typescript --statementMaxDepth 3 --statementTypenameIntrospection true'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
      maxDepth: 3,
      typenameIntrospection: true,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  // Note: after this test, future tests seem to be in a weird state, leaving this at the
  void it('fails if both stack and branch are present', async () => {
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

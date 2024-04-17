import { beforeEach, describe, it, mock } from 'node:test';
import { GenerateGraphqlClientCodeCommand } from './generate_graphql_client_code_command.js';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import path from 'path';
import { AppBackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { GenerateApiCodeAdapter } from './generate_api_code_adapter.js';
import {
  GenerateApiCodeFormat,
  GenerateApiCodeModelTarget,
  GenerateApiCodeStatementTarget,
  GenerateApiCodeTypeTarget,
} from '@aws-amplify/model-generator';
import { SandboxBackendIdResolver } from '../../sandbox/sandbox_id_resolver.js';
import { BackendIdentifierResolverWithFallback } from '../../../backend-identifier/backend_identifier_with_sandbox_fallback.js';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

void describe('generate graphql-client-code command', () => {
  const generateApiCodeAdapter = new GenerateApiCodeAdapter({
    getS3Client: () => new S3Client(),
    getAmplifyClient: () => new AmplifyClient(),
    getCloudFormationClient: () => new CloudFormationClient(),
  });

  const writeToDirectoryMock = mock.fn();
  const invokeGenerateApiCodeMock = mock.method(
    generateApiCodeAdapter,
    'invokeGenerateApiCode',
    () =>
      Promise.resolve({
        writeToDirectory: writeToDirectoryMock,
      })
  );
  const namespaceResolver = {
    resolve: () => Promise.resolve('testAppName'),
  };

  const defaultResolver = new AppBackendIdentifierResolver(namespaceResolver);

  const sandboxIdResolver = new SandboxBackendIdResolver(namespaceResolver);
  const fakeSandboxId = 'my-fake-app-my-fake-username';
  const mockedSandboxIdResolver = mock.method(sandboxIdResolver, 'resolve');
  mockedSandboxIdResolver.mock.mockImplementation(() => ({
    name: fakeSandboxId,
  }));

  const backendIdentifierResolver = new BackendIdentifierResolverWithFallback(
    defaultResolver,
    sandboxIdResolver
  );

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

  void it('uses the sandbox id by default if stack or branch are not provided', async () => {
    const handlerSpy = mock.method(
      generateApiCodeAdapter,
      'invokeGenerateApiCode'
    );
    await commandRunner.runCommand('graphql-client-code');

    assert.equal(
      (handlerSpy.mock.calls[0].arguments[0] as BackendIdentifier).name,
      fakeSandboxId
    );
  });
  void it('generates and writes graphql client code for stack', async () => {
    await commandRunner.runCommand('graphql-client-code --stack stack_name');
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
      typeTarget: GenerateApiCodeTypeTarget.TYPESCRIPT,
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
      statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
      typeTarget: GenerateApiCodeTypeTarget.TYPESCRIPT,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  void it('generates and writes graphql client code for appID and branch', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --branch branch_name --app-id app_id'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      invokeGenerateApiCodeMock.mock.calls[0].arguments[0],
      {
        type: 'branch',
        namespace: 'app_id',
        name: 'branch_name',
        format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
        statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
        typeTarget: GenerateApiCodeTypeTarget.TYPESCRIPT,
      }
    );
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
      statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
      typeTarget: GenerateApiCodeTypeTarget.TYPESCRIPT,
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
    assert.match(output, /--app-id/);
    assert.match(output, /--branch/);
    assert.match(output, /--format/);
    assert.match(output, /--statement-target/);
    assert.match(output, /--type-target/);
    assert.match(output, /--model-target/);
    assert.match(output, /--out/);
    assert.match(output, /--all/);
  });

  void it('shows all available options in help output', async () => {
    const output = await commandRunner.runCommand(
      'graphql-client-code --help --all'
    );
    assert.match(output, /--stack/);
    assert.match(output, /--app-id/);
    assert.match(output, /--branch/);
    assert.match(output, /--format/);
    assert.match(output, /--statement-target/);
    assert.match(output, /--type-target/);
    assert.match(output, /--model-target/);
    assert.match(output, /--out/);
    assert.match(output, /--all/);
    assert.match(output, /--model-generate-index-rules/);
    assert.match(output, /--model-emit-auth-provider/);
    assert.match(output, /--model-add-timestamp-fields/);
    assert.match(output, /--statement-max-depth/);
    assert.match(output, /--statement-typename-introspection/);
    assert.match(output, /--type-multiple-swift-files/);
  });

  void it('can be invoked explicitly with graphql-codegen format', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format graphql-codegen'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
      typeTarget: GenerateApiCodeTypeTarget.TYPESCRIPT,
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
      modelTarget: GenerateApiCodeModelTarget.TYPESCRIPT,
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
      'graphql-client-code --stack stack_name --format modelgen --model-generate-index-rules true --model-emit-auth-provider true --model-generate-models-for-lazy-load-and-custom-selection-set false'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.MODELGEN,
      modelTarget: GenerateApiCodeModelTarget.TYPESCRIPT,
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
      'graphql-client-code --stack stack_name --format graphql-codegen --statement-target typescript --statement-max-depth 3 --statement-typename-introspection true'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
      typeTarget: GenerateApiCodeTypeTarget.TYPESCRIPT,
      maxDepth: 3,
      typeNameIntrospection: true,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  void it('has no default type target for javascript statement target', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format graphql-codegen --statement-target javascript'
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

  void it('has default type target typescript for typescript statement target', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format graphql-codegen --statement-target typescript'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
      typeTarget: GenerateApiCodeTypeTarget.TYPESCRIPT,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  void it('has default type target flow for flow statement target', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format graphql-codegen --statement-target flow'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget: GenerateApiCodeStatementTarget.FLOW,
      typeTarget: GenerateApiCodeTypeTarget.FLOW,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  void it('has default type target angular for angular statement target', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format graphql-codegen --statement-target angular'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget: GenerateApiCodeStatementTarget.ANGULAR,
      typeTarget: GenerateApiCodeTypeTarget.ANGULAR,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  void it('has no default type target for graphql statement target', async () => {
    await commandRunner.runCommand(
      'graphql-client-code --stack stack_name --format graphql-codegen --statement-target graphql'
    );
    assert.equal(invokeGenerateApiCodeMock.mock.callCount(), 1);
    assert.deepEqual(invokeGenerateApiCodeMock.mock.calls[0].arguments[0], {
      stackName: 'stack_name',
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget: GenerateApiCodeStatementTarget.GRAPHQL,
    });
    assert.equal(writeToDirectoryMock.mock.callCount(), 1);
    assert.equal(
      writeToDirectoryMock.mock.calls[0].arguments[0],
      process.cwd()
    );
  });

  // Note: after this test, future tests seem to be in a weird state, leaving this at the end
  void it('fails if both stack and branch are present', async () => {
    const output = await commandRunner.runCommand(
      'graphql-client-code --stack foo --branch baz'
    );
    assert.match(output, /Arguments .* are mutually exclusive/);
  });
});

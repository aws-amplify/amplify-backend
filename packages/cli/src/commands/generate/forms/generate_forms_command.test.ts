import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { BackendOutputClientFactory } from '@aws-amplify/deployed-backend-client';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import assert from 'node:assert';
import path from 'node:path';
import { describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { FormGenerationHandler } from '../../../form-generation/form_generation_handler.js';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import { SandboxBackendIdResolver } from '../../sandbox/sandbox_id_resolver.js';
import { BackendIdentifierResolverWithFallback } from './backend_identifier_with_sandbox_fallback.js';
import { GenerateFormsCommand } from './generate_forms_command.js';

void describe('generate forms command', () => {
  void describe('form generation validation', () => {
    void it('models are generated in ${out-dir}/graphql', async () => {
      const credentialProvider = fromNodeProviderChain();

      const backendIdResolver = new BackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      const formGenerationHandler = new FormGenerationHandler({
        credentialProvider,
      });

      const fakedBackendOutputClient = BackendOutputClientFactory.getInstance({
        credentials: credentialProvider,
      });

      const generateFormsCommand = new GenerateFormsCommand(
        backendIdResolver,
        () => fakedBackendOutputClient,
        formGenerationHandler
      );

      const generationMock = mock.method(formGenerationHandler, 'generate');
      generationMock.mock.mockImplementation(async () => undefined);
      mock
        .method(fakedBackendOutputClient, 'getOutput')
        .mock.mockImplementation(async () => ({
          [graphqlOutputKey]: {
            payload: {
              awsAppsyncApiId: 'test_api_id',
              amplifyApiModelSchemaS3Uri: 'test_schema',
              awsAppsyncApiEndpoint: 'test_endpoint',
            },
          },
        }));
      const parser = yargs().command(
        generateFormsCommand as unknown as CommandModule
      );

      const outPath = 'my-fake-models-path';
      const commandRunner = new TestCommandRunner(parser);
      await commandRunner.runCommand(
        `forms --stack my_stack --out-dir ${outPath}`
      );
      assert.equal(
        path.join(generationMock.mock.calls[0].arguments[0].modelsOutDir),
        path.join(`${outPath}/graphql`)
      );
    });
    void it('out-dir path can be customized', async () => {
      const credentialProvider = fromNodeProviderChain();

      const backendIdResolver = new BackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      const formGenerationHandler = new FormGenerationHandler({
        credentialProvider,
      });

      const fakedBackendOutputClient = BackendOutputClientFactory.getInstance({
        credentials: credentialProvider,
      });

      const generateFormsCommand = new GenerateFormsCommand(
        backendIdResolver,
        () => fakedBackendOutputClient,
        formGenerationHandler
      );

      const generationMock = mock.method(formGenerationHandler, 'generate');
      generationMock.mock.mockImplementation(async () => undefined);
      mock
        .method(fakedBackendOutputClient, 'getOutput')
        .mock.mockImplementation(async () => ({
          [graphqlOutputKey]: {
            payload: {
              awsAppsyncApiId: 'test_api_id',
              amplifyApiModelSchemaS3Uri: 'test_schema',
              awsAppsyncApiEndpoint: 'test_endpoint',
            },
          },
        }));
      const parser = yargs().command(
        generateFormsCommand as unknown as CommandModule
      );

      const uiOutPath = './my-fake-ui-path';
      const commandRunner = new TestCommandRunner(parser);
      await commandRunner.runCommand(
        `forms --stack my_stack --out-dir ${uiOutPath}`
      );
      assert.equal(
        generationMock.mock.calls[0].arguments[0].uiOutDir,
        uiOutPath
      );
    });
    void it('./ui-components is the default graphql model generation path', async () => {
      const credentialProvider = fromNodeProviderChain();

      const backendIdResolver = new BackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      const formGenerationHandler = new FormGenerationHandler({
        credentialProvider,
      });

      const fakedBackendOutputClient = BackendOutputClientFactory.getInstance({
        credentials: credentialProvider,
      });

      const generateFormsCommand = new GenerateFormsCommand(
        backendIdResolver,
        () => fakedBackendOutputClient,
        formGenerationHandler
      );

      const generationMock = mock.method(formGenerationHandler, 'generate');
      generationMock.mock.mockImplementation(async () => undefined);
      mock
        .method(fakedBackendOutputClient, 'getOutput')
        .mock.mockImplementation(async () => ({
          [graphqlOutputKey]: {
            payload: {
              awsAppsyncApiId: 'test_api_id',
              amplifyApiModelSchemaS3Uri: 'test_schema',
              awsAppsyncApiEndpoint: 'test_endpoint',
            },
          },
        }));
      const parser = yargs().command(
        generateFormsCommand as unknown as CommandModule
      );
      const commandRunner = new TestCommandRunner(parser);
      await commandRunner.runCommand('forms --stack my_stack');
      assert.equal(
        generationMock.mock.calls[0].arguments[0].uiOutDir,
        './ui-components'
      );
    });
  });
  void it('if neither branch nor stack are provided, the sandbox id is used by default', async () => {
    const credentialProvider = fromNodeProviderChain();

    const appNameResolver = {
      resolve: () => Promise.resolve('testAppName'),
    };

    const mockedSandboxIdResolver = new SandboxBackendIdResolver(
      appNameResolver
    );

    const fakeSandboxId = 'my-fake-app-my-fake-username';

    const sandboxIdResolver = mock.method(mockedSandboxIdResolver, 'resolve');
    sandboxIdResolver.mock.mockImplementation(() => fakeSandboxId);

    const backendIdResolver = new BackendIdentifierResolverWithFallback(
      appNameResolver,
      mockedSandboxIdResolver
    );
    const formGenerationHandler = new FormGenerationHandler({
      credentialProvider,
    });

    const fakedBackendOutputClient = BackendOutputClientFactory.getInstance({
      credentials: credentialProvider,
    });

    const generateFormsCommand = new GenerateFormsCommand(
      backendIdResolver,
      () => fakedBackendOutputClient,
      formGenerationHandler
    );

    const generationMock = mock.method(formGenerationHandler, 'generate');
    generationMock.mock.mockImplementation(async () => undefined);
    mock
      .method(fakedBackendOutputClient, 'getOutput')
      .mock.mockImplementation(async () => ({
        [graphqlOutputKey]: {
          payload: {
            awsAppsyncApiId: 'test_api_id',
            amplifyApiModelSchemaS3Uri: 'test_schema',
            awsAppsyncApiEndpoint: 'test_endpoint',
          },
        },
      }));
    const parser = yargs().command(
      generateFormsCommand as unknown as CommandModule
    );
    const commandRunner = new TestCommandRunner(parser);
    await commandRunner.runCommand('forms');
    assert.deepEqual(
      generationMock.mock.calls[0].arguments[0].backendIdentifier,
      fakeSandboxId
    );
  });
});

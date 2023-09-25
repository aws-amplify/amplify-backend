import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { BackendOutputClient } from '@aws-amplify/deployed-backend-client';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import { FormGenerationHandler } from './form_generation_handler.js';
import { GenerateFormsCommand } from './generate_forms_command.js';

describe('generate forms command', () => {
  describe('form generation validation', () => {
    it('modelsOut path can be customized', async () => {
      const credentialProvider = fromNodeProviderChain();

      const backendIdResolver = new BackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      const formGenerationHandler = new FormGenerationHandler({
        credentialProvider,
      });

      const fakedBackendOutputClient = new BackendOutputClient(
        credentialProvider,
        { stackName: 'test_stack' }
      );

      const generateFormsCommand = new GenerateFormsCommand(
        backendIdResolver,
        () => fakedBackendOutputClient,
        formGenerationHandler
      );

      const generationMock = mock.method(formGenerationHandler, 'generate');
      generationMock.mock.mockImplementation(async () => {});
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

      const modelsOutPath = './my-fake-models-path';
      const commandRunner = new TestCommandRunner(parser);
      await commandRunner.runCommand(
        `forms --stack my_stack --modelsOut ${modelsOutPath}`
      );
      assert.equal(
        generationMock.mock.calls[0].arguments[0].modelsOut,
        modelsOutPath
      );
    });
    it('uiOut path can be customized', async () => {
      const credentialProvider = fromNodeProviderChain();

      const backendIdResolver = new BackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      const formGenerationHandler = new FormGenerationHandler({
        credentialProvider,
      });

      const fakedBackendOutputClient = new BackendOutputClient(
        credentialProvider,
        { stackName: 'test_stack' }
      );

      const generateFormsCommand = new GenerateFormsCommand(
        backendIdResolver,
        () => fakedBackendOutputClient,
        formGenerationHandler
      );

      const generationMock = mock.method(formGenerationHandler, 'generate');
      generationMock.mock.mockImplementation(async () => {});
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
        `forms --stack my_stack --uiOut ${uiOutPath}`
      );
      assert.equal(generationMock.mock.calls[0].arguments[0].uiOut, uiOutPath);
    });
    it('./src/ui-components is the default graphql model generation path', async () => {
      const credentialProvider = fromNodeProviderChain();

      const backendIdResolver = new BackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      const formGenerationHandler = new FormGenerationHandler({
        credentialProvider,
      });

      const fakedBackendOutputClient = new BackendOutputClient(
        credentialProvider,
        { stackName: 'test_stack' }
      );

      const generateFormsCommand = new GenerateFormsCommand(
        backendIdResolver,
        () => fakedBackendOutputClient,
        formGenerationHandler
      );

      const generationMock = mock.method(formGenerationHandler, 'generate');
      generationMock.mock.mockImplementation(async () => {});
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
        generationMock.mock.calls[0].arguments[0].uiOut,
        './src/ui-components'
      );
    });
    it('./src/graphql is the default graphql model generation path', async () => {
      const credentialProvider = fromNodeProviderChain();

      const backendIdResolver = new BackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      const formGenerationHandler = new FormGenerationHandler({
        credentialProvider,
      });

      const fakedBackendOutputClient = new BackendOutputClient(
        credentialProvider,
        { stackName: 'test_stack' }
      );

      const generateFormsCommand = new GenerateFormsCommand(
        backendIdResolver,
        () => fakedBackendOutputClient,
        formGenerationHandler
      );

      const generationMock = mock.method(formGenerationHandler, 'generate');
      generationMock.mock.mockImplementation(async () => {});
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
        generationMock.mock.calls[0].arguments[0].modelsOut,
        './src/graphql'
      );
    });
  });
  describe('backend output validation', () => {
    it('throws an error if the appsync endpoint is undefined', async () => {
      const credentialProvider = fromNodeProviderChain();

      const backendIdResolver = new BackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      const formGenerationHandler = new FormGenerationHandler({
        credentialProvider,
      });

      const fakedBackendOutputClient = new BackendOutputClient(
        credentialProvider,
        { stackName: 'test_stack' }
      );

      const generateFormsCommand = new GenerateFormsCommand(
        backendIdResolver,
        () => fakedBackendOutputClient,
        formGenerationHandler
      );

      const generationMock = mock.method(formGenerationHandler, 'generate');
      generationMock.mock.mockImplementation(async () => {});
      mock
        .method(fakedBackendOutputClient, 'getOutput')
        .mock.mockImplementation(async () => ({
          [graphqlOutputKey]: {
            payload: {
              awsAppsyncApiId: 'test_api_id',
              amplifyApiModelSchemaS3Uri: 'test_schema',
            },
          },
        }));
      const parser = yargs().command(
        generateFormsCommand as unknown as CommandModule
      );
      const commandRunner = new TestCommandRunner(parser);
      await assert.rejects(() =>
        commandRunner.runCommand('forms --stack my_stack_name')
      );
    });
    it('throws an error if the appsync api id is undefined', async () => {
      const credentialProvider = fromNodeProviderChain();

      const backendIdResolver = new BackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      const formGenerationHandler = new FormGenerationHandler({
        credentialProvider,
      });

      const fakedBackendOutputClient = new BackendOutputClient(
        credentialProvider,
        { stackName: 'test_stack' }
      );

      const generateFormsCommand = new GenerateFormsCommand(
        backendIdResolver,
        () => fakedBackendOutputClient,
        formGenerationHandler
      );
      const generationMock = mock.method(formGenerationHandler, 'generate');
      generationMock.mock.mockImplementation(async () => {});
      mock
        .method(fakedBackendOutputClient, 'getOutput')
        .mock.mockImplementation(() => ({
          [graphqlOutputKey]: {
            payload: {
              awsAppsyncApiEndpoint: 'test_api_endpoint',
              amplifyApiModelSchemaS3Uri: 'test_schema',
            },
          },
        }));
      const parser = yargs().command(
        generateFormsCommand as unknown as CommandModule
      );
      const commandRunner = new TestCommandRunner(parser);
      await assert.rejects(() =>
        commandRunner.runCommand('forms --stack my_stack_name')
      );
    });
    it('throws an error if the appsync schema url is undefined', async () => {
      const credentialProvider = fromNodeProviderChain();

      const backendIdResolver = new BackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      const formGenerationHandler = new FormGenerationHandler({
        credentialProvider,
      });

      const fakedBackendOutputClient = new BackendOutputClient(
        credentialProvider,
        { stackName: 'test_stack' }
      );

      const generateFormsCommand = new GenerateFormsCommand(
        backendIdResolver,
        () => fakedBackendOutputClient,
        formGenerationHandler
      );
      const generationMock = mock.method(formGenerationHandler, 'generate');
      generationMock.mock.mockImplementation(async () => {});
      mock
        .method(fakedBackendOutputClient, 'getOutput')
        .mock.mockImplementation(() => ({
          [graphqlOutputKey]: {
            payload: {
              awsAppsyncApiEndpoint: 'test_api_endpoint',
              awsAppsyncApiId: 'test_api_id',
            },
          },
        }));
      const parser = yargs().command(
        generateFormsCommand as unknown as CommandModule
      );
      const commandRunner = new TestCommandRunner(parser);
      await assert.rejects(() =>
        commandRunner.runCommand('forms --stack my_stack_name')
      );
    });
  });
});

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
    it('modelsOutDir path can be customized', async () => {
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
        `forms --stack my_stack --modelsOutDir ${modelsOutPath}`
      );
      assert.equal(
        generationMock.mock.calls[0].arguments[0].modelsOutDir,
        modelsOutPath
      );
    });
    it('uiOutDir path can be customized', async () => {
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
        `forms --stack my_stack --uiOutDir ${uiOutPath}`
      );
      assert.equal(
        generationMock.mock.calls[0].arguments[0].uiOutDir,
        uiOutPath
      );
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
        generationMock.mock.calls[0].arguments[0].uiOutDir,
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
        generationMock.mock.calls[0].arguments[0].modelsOutDir,
        './src/graphql'
      );
    });
  });
});

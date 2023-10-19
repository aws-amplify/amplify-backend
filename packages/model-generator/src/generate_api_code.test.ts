import assert from 'assert';
import { describe, it, mock } from 'node:test';
import {
  GenerateApiCodeFormat,
  GenerateApiCodeModelTarget,
  GenerateApiCodeProps,
  GenerateApiCodeStatementTarget,
  GenerateApiCodeTypeTarget,
  generateApiCode,
} from './generate_api_code.js';
import {
  GraphqlDocumentGenerator,
  GraphqlModelsGenerator,
  GraphqlTypesGenerator,
} from './model_generator.js';

void describe('generateAPICode', () => {
  void describe('graphql-codegen', () => {
    void it('is invoked with expected input, and returns generated output', async () => {
      const expectedDocsResults = { docGen: 'results1' };
      const unexpectedTypeResults = { typeGen: 'results2' };

      // Setup mocked generators
      const generateModels = mock.fn(async () => ({
        writeToDirectory: mock.fn(),
        getResults: async () => expectedDocsResults,
      }));
      const generateTypes = mock.fn(async () => ({
        writeToDirectory: mock.fn(),
        getResults: async () => unexpectedTypeResults,
      }));
      const overrideGraphqlDocumentGenerator = {
        generateModels,
      } as unknown as GraphqlDocumentGenerator;
      const overrideGraphqlTypesGenerator = {
        generateTypes,
      } as unknown as GraphqlTypesGenerator;

      const results = await generateApiCode({
        stackName: 'testStack',
        overrideGraphqlDocumentGenerator,
        overrideGraphqlTypesGenerator,
        format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
        statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
      });

      // Validate generate calls
      assert.equal(generateModels.mock.callCount(), 1);
      assert.deepEqual((generateModels.mock.calls[0].arguments as any)[0], {
        language: 'typescript',
        maxDepth: undefined,
        typenameIntrospection: undefined,
      });
      assert.equal(generateTypes.mock.callCount(), 0);

      const receivedResults = await results.getResults();
      assert.deepEqual(receivedResults, expectedDocsResults);
    });

    void it('passes through provided parameters', async () => {
      const expectedDocsResults = { docGen: 'results1' };
      const unexpectedTypeResults = { typeGen: 'results2' };

      // Setup mocked generators
      const generateModels = mock.fn(async () => ({
        writeToDirectory: mock.fn(),
        getResults: async () => expectedDocsResults,
      }));
      const generateTypes = mock.fn(async () => ({
        writeToDirectory: mock.fn(),
        getResults: async () => unexpectedTypeResults,
      }));
      const overrideGraphqlDocumentGenerator = {
        generateModels,
      } as unknown as GraphqlDocumentGenerator;
      const overrideGraphqlTypesGenerator = {
        generateTypes,
      } as unknown as GraphqlTypesGenerator;

      const results = await generateApiCode({
        stackName: 'testStack',
        overrideGraphqlDocumentGenerator,
        overrideGraphqlTypesGenerator,
        format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
        statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
        maxDepth: 3,
        typeNameIntrospection: false,
      });

      // Validate generate calls
      assert.equal(generateModels.mock.callCount(), 1);
      assert.deepEqual((generateModels.mock.calls[0].arguments as any)[0], {
        language: 'typescript',
        maxDepth: 3,
        typenameIntrospection: false,
      });
      assert.equal(generateTypes.mock.callCount(), 0);

      const receivedResults = await results.getResults();
      assert.deepEqual(receivedResults, expectedDocsResults);
    });

    void it('sets relativeTypesPath if both typescript statements and types are generated', async () => {
      const expectedDocsResults = { docGen: 'results1' };
      const expectedTypesResults = { typeGen: 'results2' };

      // Setup mocked generators
      const generateModels = mock.fn(async () => ({
        writeToDirectory: mock.fn(),
        getResults: async () => expectedDocsResults,
      }));
      const generateTypes = mock.fn(async () => ({
        writeToDirectory: mock.fn(),
        getResults: async () => expectedTypesResults,
      }));
      const overrideGraphqlDocumentGenerator = {
        generateModels,
      } as unknown as GraphqlDocumentGenerator;
      const overrideGraphqlTypesGenerator = {
        generateTypes,
      } as unknown as GraphqlTypesGenerator;

      const results = await generateApiCode({
        stackName: 'testStack',
        overrideGraphqlDocumentGenerator,
        overrideGraphqlTypesGenerator,
        format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
        statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
        typeTarget: GenerateApiCodeTypeTarget.TYPESCRIPT,
      });

      // Validate generate calls
      assert.equal(generateModels.mock.callCount(), 1);
      assert.deepEqual((generateModels.mock.calls[0].arguments as any)[0], {
        language: 'typescript',
        maxDepth: undefined,
        relativeTypesPath: './API',
        typenameIntrospection: undefined,
      });
      assert.equal(generateTypes.mock.callCount(), 1);
      assert.deepEqual((generateTypes.mock.calls[0].arguments as any)[0], {
        target: 'typescript',
        multipleSwiftFiles: undefined,
      });

      const receivedResults = await results.getResults();
      assert.deepEqual(receivedResults, {
        ...expectedDocsResults,
        ...expectedTypesResults,
      });
    });
  });

  void describe('modelgen', () => {
    void it('is invoked with expected input, and returns generated output', async () => {
      const expectedResults = { modelgen: 'results' };

      // Setup mocked generator
      const generateModels = mock.fn(async () => ({
        writeToDirectory: mock.fn(),
        getResults: async () => expectedResults,
      }));
      const overrideGraphqlModelsGenerator = {
        generateModels,
      } as unknown as GraphqlModelsGenerator;

      const results = await generateApiCode({
        stackName: 'testStack',
        overrideGraphqlModelsGenerator,
        format: GenerateApiCodeFormat.MODELGEN,
        modelTarget: GenerateApiCodeModelTarget.TYPESCRIPT,
      });
      assert.equal(generateModels.mock.callCount(), 1);
      assert.deepEqual((generateModels.mock.calls[0].arguments as any)[0], {
        target: 'typescript',
        addTimestampFields: undefined,
        emitAuthProvider: undefined,
        generateIndexRules: undefined,
        generateModelsForLazyLoadAndCustomSelectionSet: undefined,
        handleListNullabilityTransparently: undefined,
        respectPrimaryKeyAttributesOnConnectionField: undefined,
        transformerVersion: undefined,
        useExperimentalPipelinedTransformer: undefined,
      });

      const receivedResults = await results.getResults();
      assert.deepEqual(receivedResults, expectedResults);
    });

    void it('is passing through any provided params', async () => {
      // Setup mocked generator
      const generateModels = mock.fn(async () => ({
        writeToDirectory: mock.fn(),
        getResults: async () => ({}),
      }));
      const overrideGraphqlModelsGenerator = {
        generateModels,
      } as unknown as GraphqlModelsGenerator;

      await generateApiCode({
        stackName: 'testStack',
        overrideGraphqlModelsGenerator,
        format: GenerateApiCodeFormat.MODELGEN,
        modelTarget: GenerateApiCodeModelTarget.DART,
        respectPrimaryKeyAttributesOnConnectionField: true,
        handleListNullabilityTransparently: true,
        addTimestampFields: false,
      });
      assert.equal(generateModels.mock.callCount(), 1);
      assert.deepEqual((generateModels.mock.calls[0].arguments as any)[0], {
        target: 'dart',
        addTimestampFields: false,
        emitAuthProvider: undefined,
        generateIndexRules: undefined,
        generateModelsForLazyLoadAndCustomSelectionSet: undefined,
        handleListNullabilityTransparently: true,
        respectPrimaryKeyAttributesOnConnectionField: true,
        transformerVersion: undefined,
        useExperimentalPipelinedTransformer: undefined,
      });
    });
  });

  void describe('introspection', () => {
    void it('is invoked with expected input, and returns generated output', async () => {
      const expectedResults = { introspection: 'results' };

      // Setup mocked generator
      const generateModels = mock.fn(async () => ({
        writeToDirectory: mock.fn(),
        getResults: async () => expectedResults,
      }));
      const overrideGraphqlModelsGenerator = {
        generateModels,
      } as unknown as GraphqlModelsGenerator;

      const results = await generateApiCode({
        stackName: 'testStack',
        overrideGraphqlModelsGenerator,
        format: GenerateApiCodeFormat.INTROSPECTION,
      });
      assert.equal(generateModels.mock.callCount(), 1);
      assert.deepEqual((generateModels.mock.calls[0].arguments as any)[0], {
        target: 'introspection',
      });

      const receivedResults = await results.getResults();
      assert.deepEqual(receivedResults, expectedResults);
    });
  });

  void it('throws error on unknown format', async () => {
    const props = {
      format: 'unsupported',
      stackName: 'stack_name',
    } as unknown as GenerateApiCodeProps;
    await assert.rejects(() => generateApiCode(props));
  });
});

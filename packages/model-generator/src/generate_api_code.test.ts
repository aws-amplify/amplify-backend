import assert from 'assert';
import { describe, it, mock } from 'node:test';
import {
  ApiCodeGenerator,
  GenerateApiCodeFormat,
  GenerateApiCodeModelTarget,
  GenerateApiCodeProps,
  GenerateApiCodeStatementTarget,
  GenerateApiCodeTypeTarget,
} from './generate_api_code.js';
import {
  GraphqlDocumentGenerator,
  GraphqlModelsGenerator,
  GraphqlTypesGenerator,
} from './model_generator.js';

void describe('generateAPICode', () => {
  const noopGenerate = mock.fn(async () => ({
    writeToDirectory: mock.fn(),
    getResults: async () => ({}),
  }));
  const noopGraphqlDocumentGenerator = {
    generateModels: noopGenerate,
  } as unknown as GraphqlDocumentGenerator;
  const noopGraphqlTypesGenerator = {
    generateModels: noopGenerate,
  } as unknown as GraphqlTypesGenerator;
  const noopGraphqlModelsGenerator = {
    generateModels: noopGenerate,
  } as unknown as GraphqlModelsGenerator;

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

      const graphqlDocumentGenerator = {
        generateModels,
      } as unknown as GraphqlDocumentGenerator;
      const graphqlTypesGenerator = {
        generateTypes,
      } as unknown as GraphqlTypesGenerator;

      const results = await new ApiCodeGenerator(
        graphqlDocumentGenerator,
        graphqlTypesGenerator,
        noopGraphqlModelsGenerator
      ).generate({
        format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
        statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
      });

      // Validate generate calls
      assert.equal(generateModels.mock.callCount(), 1);
      assert.deepEqual(
        (generateModels.mock.calls[0].arguments as unknown[])[0],
        {
          targetFormat: 'typescript',
          maxDepth: undefined,
          typenameIntrospection: undefined,
        }
      );
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
      const graphqlDocumentGenerator = {
        generateModels,
      } as unknown as GraphqlDocumentGenerator;
      const graphqlTypesGenerator = {
        generateTypes,
      } as unknown as GraphqlTypesGenerator;

      const results = await new ApiCodeGenerator(
        graphqlDocumentGenerator,
        graphqlTypesGenerator,
        noopGraphqlModelsGenerator
      ).generate({
        format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
        statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
        maxDepth: 3,
        typeNameIntrospection: false,
      });

      // Validate generate calls
      assert.equal(generateModels.mock.callCount(), 1);
      assert.deepEqual(
        (generateModels.mock.calls[0].arguments as unknown[])[0],
        {
          targetFormat: 'typescript',
          maxDepth: 3,
          typenameIntrospection: false,
        }
      );
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
      const graphqlDocumentGenerator = {
        generateModels,
      } as unknown as GraphqlDocumentGenerator;
      const graphqlTypesGenerator = {
        generateTypes,
      } as unknown as GraphqlTypesGenerator;

      const results = await new ApiCodeGenerator(
        graphqlDocumentGenerator,
        graphqlTypesGenerator,
        noopGraphqlModelsGenerator
      ).generate({
        format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
        statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
        typeTarget: GenerateApiCodeTypeTarget.TYPESCRIPT,
      });

      // Validate generate calls
      assert.equal(generateModels.mock.callCount(), 1);
      assert.deepEqual(
        (generateModels.mock.calls[0].arguments as unknown[])[0],
        {
          targetFormat: 'typescript',
          maxDepth: undefined,
          relativeTypesPath: './API',
          typenameIntrospection: undefined,
        }
      );
      assert.equal(generateTypes.mock.callCount(), 1);
      assert.deepEqual(
        (generateTypes.mock.calls[0].arguments as unknown[])[0],
        {
          target: 'typescript',
          multipleSwiftFiles: undefined,
          maxDepth: undefined,
          typenameIntrospection: undefined,
        }
      );

      const receivedResults = await results.getResults();
      assert.deepEqual(receivedResults, {
        ...expectedDocsResults,
        ...expectedTypesResults,
      });
    });
    void it('passes maxDepth and typeNameIntrospection to type generation', async () => {
      const expectedTypesResults = { typeGen: 'results2' };

      // Setup mocked generators
      const generateTypes = mock.fn(async () => ({
        writeToDirectory: mock.fn(),
        getResults: async () => expectedTypesResults,
      }));
      const graphqlTypesGenerator = {
        generateTypes,
      } as unknown as GraphqlTypesGenerator;

      const results = await new ApiCodeGenerator(
        noopGraphqlDocumentGenerator,
        graphqlTypesGenerator,
        noopGraphqlModelsGenerator
      ).generate({
        format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
        statementTarget: GenerateApiCodeStatementTarget.TYPESCRIPT,
        typeTarget: GenerateApiCodeTypeTarget.TYPESCRIPT,
        maxDepth: 5,
        typeNameIntrospection: true,
      });

      // Validate generate calls
      assert.equal(generateTypes.mock.callCount(), 1);
      assert.deepEqual(
        (generateTypes.mock.calls[0].arguments as unknown[])[0],
        {
          target: 'typescript',
          multipleSwiftFiles: undefined,
          maxDepth: 5,
          typenameIntrospection: true,
        }
      );

      const receivedResults = await results.getResults();
      assert.deepEqual(receivedResults, {
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
      const graphqlModelsGenerator = {
        generateModels,
      } as unknown as GraphqlModelsGenerator;

      const results = await new ApiCodeGenerator(
        noopGraphqlDocumentGenerator,
        noopGraphqlTypesGenerator,
        graphqlModelsGenerator
      ).generate({
        format: GenerateApiCodeFormat.MODELGEN,
        modelTarget: GenerateApiCodeModelTarget.TYPESCRIPT,
      });

      assert.equal(generateModels.mock.callCount(), 1);
      assert.deepEqual(
        (generateModels.mock.calls[0].arguments as unknown[])[0],
        {
          target: 'typescript',
          addTimestampFields: undefined,
          emitAuthProvider: undefined,
          generateIndexRules: undefined,
          generateModelsForLazyLoadAndCustomSelectionSet: undefined,
          handleListNullabilityTransparently: undefined,
          respectPrimaryKeyAttributesOnConnectionField: undefined,
          transformerVersion: undefined,
          useExperimentalPipelinedTransformer: undefined,
        }
      );

      const receivedResults = await results.getResults();
      assert.deepEqual(receivedResults, expectedResults);
    });

    void it('is passing through any provided params', async () => {
      // Setup mocked generator
      const generateModels = mock.fn(async () => ({
        writeToDirectory: mock.fn(),
        getResults: async () => ({}),
      }));
      const graphqlModelsGenerator = {
        generateModels,
      } as unknown as GraphqlModelsGenerator;

      await new ApiCodeGenerator(
        noopGraphqlDocumentGenerator,
        noopGraphqlTypesGenerator,
        graphqlModelsGenerator
      ).generate({
        format: GenerateApiCodeFormat.MODELGEN,
        modelTarget: GenerateApiCodeModelTarget.DART,
        respectPrimaryKeyAttributesOnConnectionField: true,
        handleListNullabilityTransparently: true,
        addTimestampFields: false,
      });
      assert.equal(generateModels.mock.callCount(), 1);
      assert.deepEqual(
        (generateModels.mock.calls[0].arguments as unknown[])[0],
        {
          target: 'dart',
          addTimestampFields: false,
          emitAuthProvider: undefined,
          generateIndexRules: undefined,
          generateModelsForLazyLoadAndCustomSelectionSet: undefined,
          handleListNullabilityTransparently: true,
          respectPrimaryKeyAttributesOnConnectionField: true,
          transformerVersion: undefined,
          useExperimentalPipelinedTransformer: undefined,
        }
      );
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
      const graphqlModelsGenerator = {
        generateModels,
      } as unknown as GraphqlModelsGenerator;

      const results = await new ApiCodeGenerator(
        noopGraphqlDocumentGenerator,
        noopGraphqlTypesGenerator,
        graphqlModelsGenerator
      ).generate({
        format: GenerateApiCodeFormat.INTROSPECTION,
      });

      assert.equal(generateModels.mock.callCount(), 1);
      assert.deepEqual(
        (generateModels.mock.calls[0].arguments as unknown[])[0],
        {
          target: 'introspection',
        }
      );

      const receivedResults = await results.getResults();
      assert.deepEqual(receivedResults, expectedResults);
    });
  });

  void it('throws error on unknown format', async () => {
    const generator = new ApiCodeGenerator(
      noopGraphqlDocumentGenerator,
      noopGraphqlTypesGenerator,
      noopGraphqlModelsGenerator
    );
    const props = {
      format: 'unsupported',
    } as unknown as GenerateApiCodeProps;
    await assert.rejects(async () => await generator.generate(props));
  });
});

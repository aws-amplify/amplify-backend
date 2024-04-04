import { GenericDataSchema } from '@aws-amplify/codegen-ui';
import assert from 'assert';
import { describe, it, mock } from 'node:test';
import fs from 'fs/promises';
import { CodegenGraphqlFormGeneratorResult } from './codegen_graphql_form_generation_result.js';
import {
  LocalGraphqlFormGenerator,
  ResultBuilder,
} from './local_codegen_graphql_form_generator.js';

type MockDataType = 'String' | 'ID' | 'AWSDateTime';

type MockFieldOptions = { required?: boolean; readOnly?: boolean };

const createMockField = (
  dataType: MockDataType,
  options?: MockFieldOptions
) => {
  const { required = false, readOnly = false } = options ?? {};
  return {
    dataType: dataType,
    dataTypeValue: dataType,
    readOnly,
    required,
    isArray: false,
  };
};

const createMockSchema = (fields: string[]): GenericDataSchema => {
  const models = fields.reduce(
    (prev, name) => ({
      ...prev,
      [name]: {
        primaryKeys: ['id'],
        fields: {
          id: createMockField('ID', { required: true }),
          title: createMockField('String'),
          content: createMockField('String'),
          updatedAt: createMockField('AWSDateTime', {
            readOnly: true,
            required: false,
          }),
          createdAt: createMockField('AWSDateTime', {
            readOnly: true,
            required: false,
          }),
        },
      },
    }),
    {}
  );
  return {
    models,
    nonModels: {},
    enums: {},
  } as GenericDataSchema;
};

void describe('LocalCodegenGraphqlFormGenerator', () => {
  void describe('util files', () => {
    void it('generates util file', async () => {
      const models = ['Foo'];
      const schema = createMockSchema(models);
      const l = new LocalGraphqlFormGenerator(
        async () => schema as unknown as GenericDataSchema,
        {
          graphqlDir: '../graphql',
        },
        (map) => {
          return new CodegenGraphqlFormGeneratorResult(map);
        }
      );
      const output = await l.generateForms();
      const fsMock = mock.method(fs, 'open');
      const writeFileMock = mock.fn();
      fsMock.mock.mockImplementation(async () => ({
        writeFile: writeFileMock,
        stat: async () => ({}),
        close: async () => undefined,
      }));
      const { filesWritten } = await output.writeToDirectory('./');
      const writeArgs = fsMock.mock.calls.flatMap((c) => c.arguments[0]);
      const writeFileArgs = writeFileMock.mock.calls.flatMap(
        (c) => c.arguments[0]
      );

      assert(
        writeFileArgs.some((fileContent) =>
          fileContent.includes(
            'import { fetchUserAttributes, signOut } from "aws-amplify/auth'
          )
        )
      );

      const utilFSWriteArgs = writeArgs.filter((e) =>
        /utils\.[jt]s[x]?/.test(e.toString())
      );

      assert(utilFSWriteArgs.length > 0);

      utilFSWriteArgs.forEach((fileName) => {
        assert(
          filesWritten.some((file) =>
            new RegExp(`${fileName as string}`).test(file)
          )
        );
      });
    });
    void it('generates index file', async () => {
      const models = ['Post', 'Author', 'Foo'];
      const schema = createMockSchema(models);
      const l = new LocalGraphqlFormGenerator(
        async () => schema as unknown as GenericDataSchema,
        {
          graphqlDir: '../graphql',
        },
        (map) => {
          return new CodegenGraphqlFormGeneratorResult(map);
        }
      );
      const output = await l.generateForms();
      const fsMock = mock.method(fs, 'open');
      fsMock.mock.mockImplementation(async () => ({
        writeFile: async () => undefined,
        stat: async () => ({}),
        close: async () => undefined,
      }));
      const { filesWritten } = await output.writeToDirectory('./');
      const writeArgs = fsMock.mock.calls.flatMap((c) => c.arguments[0]);
      assert(writeArgs.includes('index.js'));

      assert(filesWritten.some((file) => new RegExp('^index.js$').test(file)));
    });
  });
  void describe('filtering', () => {
    void it('throws an error if a non-existent model is passed in the filter', async () => {
      const schema = createMockSchema(['Post']);
      const l = new LocalGraphqlFormGenerator(
        async () => schema as unknown as GenericDataSchema,
        {
          graphqlDir: '../graphql',
        },
        (map) => {
          return new CodegenGraphqlFormGeneratorResult(map);
        }
      );
      await assert.rejects(() => l.generateForms({ models: ['Author'] }));
    });
    void it('type declaration files are created for each model', async () => {
      const models = ['Post', 'Author', 'Foo'];
      const schema = createMockSchema(models);
      const l = new LocalGraphqlFormGenerator(
        async () => schema as unknown as GenericDataSchema,
        {
          graphqlDir: '../graphql',
        },
        (map) => {
          return new CodegenGraphqlFormGeneratorResult(map);
        }
      );
      const output = await l.generateForms();
      const fsMock = mock.method(fs, 'open');
      fsMock.mock.mockImplementation(async () => ({
        writeFile: async () => undefined,
        stat: async () => ({}),
        close: async () => undefined,
      }));
      const { filesWritten } = await output.writeToDirectory('./');
      const writeArgs = fsMock.mock.calls.flatMap((c) => c.arguments[0]);
      assert(
        models.every((m) => {
          const didWriteFile = writeArgs.some((arg) =>
            new RegExp(`${m}(Update|Create)Form.d.ts`).test(arg.toString())
          );
          const didLogMessage = filesWritten.some((file) =>
            new RegExp(`^${m}(Update|Create)Form.d.ts$`).test(file.toString())
          );
          return didWriteFile && didLogMessage;
        })
      );
    });
    void it('when an undefined filter is passed, all models are generated', async () => {
      const models = ['Post', 'Author', 'Foo'];
      const schema = createMockSchema(models);
      const l = new LocalGraphqlFormGenerator(
        async () => schema as unknown as GenericDataSchema,
        {
          graphqlDir: '../graphql',
        },
        (map) => {
          return new CodegenGraphqlFormGeneratorResult(map);
        }
      );
      const output = await l.generateForms();
      const fsMock = mock.method(fs, 'open');
      fsMock.mock.mockImplementation(async () => ({
        writeFile: async () => undefined,
        stat: async () => ({}),
        close: async () => undefined,
      }));
      await output.writeToDirectory('./');
      const writeArgs = fsMock.mock.calls.flatMap((c) => c.arguments[0]);
      assert(
        models.every((m) => {
          return writeArgs.some((arg) => (arg as string).includes(m));
        })
      );
    });
    void it('when an empty filter is passed, all models are generated', async () => {
      const models = ['Post', 'Author', 'Foo'];
      const schema = createMockSchema(models);
      const l = new LocalGraphqlFormGenerator(
        async () => schema as unknown as GenericDataSchema,
        {
          graphqlDir: '../graphql',
        },
        (map) => {
          return new CodegenGraphqlFormGeneratorResult(map);
        }
      );
      const output = await l.generateForms({ models: [] });
      const fsMock = mock.method(fs, 'open');
      fsMock.mock.mockImplementation(async () => ({
        writeFile: async () => undefined,
        stat: async () => ({}),
        close: async () => undefined,
      }));
      await output.writeToDirectory('./');
      const writeArgs = fsMock.mock.calls.flatMap((c) => c.arguments[0]);
      assert(
        models.every((m) => {
          return writeArgs.some((arg) => (arg as string).includes(m));
        })
      );
    });
    void it('generates each model in filter', async () => {
      const schema = createMockSchema(['Post', 'Author', 'Foo']);
      const l = new LocalGraphqlFormGenerator(
        async () => schema as unknown as GenericDataSchema,
        {
          graphqlDir: '../graphql',
        },
        (map) => {
          return new CodegenGraphqlFormGeneratorResult(map);
        }
      );
      const models = ['Author', 'Post'];
      const output = await l.generateForms({ models });
      const fsMock = mock.method(fs, 'open');
      fsMock.mock.mockImplementation(async () => ({
        writeFile: async () => undefined,
        stat: async () => ({}),
        close: async () => undefined,
      }));
      await output.writeToDirectory('./');
      const writeArgs = fsMock.mock.calls.flatMap((c) => c.arguments[0]);
      assert(
        models.every((m) => {
          return writeArgs.some((arg) => (arg as string).includes(m));
        })
      );
    });
    void it('only generates forms specified in the filter', async () => {
      const schema = createMockSchema(['Post', 'Author']);
      const l = new LocalGraphqlFormGenerator(
        async () => schema as unknown as GenericDataSchema,
        {
          graphqlDir: '../graphql',
        },
        (map) => {
          return new CodegenGraphqlFormGeneratorResult(map);
        }
      );
      const output = await l.generateForms({ models: ['Author'] });
      const fsMock = mock.method(fs, 'open');
      fsMock.mock.mockImplementation(async () => ({
        writeFile: async () => undefined,
        stat: async () => ({}),
        close: async () => undefined,
      }));
      await output.writeToDirectory('./');
      const writeArgs = fsMock.mock.calls.flatMap((c) =>
        c.arguments[0].toString()
      );
      assert(writeArgs.every((c) => !c.startsWith('Post')));
    });
  });
  void it('generates a form', async () => {
    const schema = createMockSchema(['Post']);
    const l = new LocalGraphqlFormGenerator(
      async () => schema as unknown as GenericDataSchema,
      {
        graphqlDir: '../graphql',
      },
      (map) => new CodegenGraphqlFormGeneratorResult(map)
    );
    const forms = await l.generateForms();
    assert('writeToDirectory' in forms);
  });
  const graphqlDirectories = [
    ['./graphql'],
    ['../graphql'],
    ['../my-folder'],
    ['./my-folder/a-sub-folder'],
    ['graphql', './graphql'],
    ['gql/graphql', './gql/graphql'],
  ];
  void it(`id fields with type ID and required option are automatically removed from the generated form`, async () => {
    const schema = createMockSchema(['Post']);
    assert('id' in schema.models.Post.fields);
    const resultGenerationSpy = mock.fn<ResultBuilder>();
    resultGenerationSpy.mock.mockImplementation(() => ({
      writeToDirectory: async () => undefined,
    }));
    const l = new LocalGraphqlFormGenerator(
      async () => schema as unknown as GenericDataSchema,
      {
        graphqlDir: './ui-components',
      },
      resultGenerationSpy
    );

    await l.generateForms();

    assert.equal(resultGenerationSpy.mock.callCount(), 1);
    const componentMap = resultGenerationSpy.mock.calls[0].arguments[0];

    const component = componentMap['PostCreateForm.jsx'];
    assert.equal(component.includes(`label="Id"`), false);
  });
  void it(`createdAt and updatedAt fields are removed from the generated form`, async () => {
    const schema = createMockSchema(['Post']);
    assert('createdAt' in schema.models.Post.fields);
    assert('updatedAt' in schema.models.Post.fields);
    const resultGenerationSpy = mock.fn<ResultBuilder>();
    resultGenerationSpy.mock.mockImplementation(() => ({
      writeToDirectory: async () => undefined,
    }));
    const l = new LocalGraphqlFormGenerator(
      async () => schema as unknown as GenericDataSchema,
      {
        graphqlDir: './ui-components',
      },
      resultGenerationSpy
    );

    await l.generateForms();

    assert.equal(resultGenerationSpy.mock.callCount(), 1);
    const componentMap = resultGenerationSpy.mock.calls[0].arguments[0];

    const component = componentMap['PostCreateForm.jsx'];
    assert.equal(component.includes(`createdAt`), false);
    assert.equal(component.includes(`updatedAt`), false);
  });
  for (const [directory, outputDir = directory] of graphqlDirectories) {
    void it(`given the directory ${directory}, the correct import path appears for the mutations in the generated form`, async () => {
      const schema = createMockSchema(['Post']);

      const resultGenerationSpy = mock.fn<ResultBuilder>();
      resultGenerationSpy.mock.mockImplementation(() => ({
        writeToDirectory: async () => undefined,
      }));
      const l = new LocalGraphqlFormGenerator(
        async () => schema as unknown as GenericDataSchema,
        {
          graphqlDir: directory,
        },
        resultGenerationSpy
      );

      await l.generateForms();

      assert.equal(resultGenerationSpy.mock.callCount(), 1);
      const componentMap = resultGenerationSpy.mock.calls[0].arguments[0];

      const component = componentMap['PostCreateForm.jsx'];
      assert(component.includes(`from "${outputDir}/mutations"`));
    });
  }
});

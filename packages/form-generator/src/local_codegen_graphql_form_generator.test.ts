import { GenericDataSchema } from '@aws-amplify/codegen-ui';
import assert from 'assert';
import { it } from 'node:test';
import { CodegenGraphqlFormGeneratorResult } from './codegen_graphql_form_generation_result.js';
import { LocalGraphqlFormGenerator } from './local_codegen_graphql_form_generator.js';

it('generates a form', async () => {
  const schema = {
    models: {
      Post: {
        primaryKeys: ['id'],
        fields: {
          id: {
            dataType: 'ID',
            dataTypeValue: 'ID',
            required: true,
            readOnly: false,
            isArray: false,
          },
          title: {
            dataType: 'String',
            dataTypeValue: 'String',
            required: false,
            readOnly: false,
            isArray: false,
          },
          content: {
            dataType: 'String',
            dataTypeValue: 'String',
            required: false,
            readOnly: false,
            isArray: false,
          },
          createdAt: {
            dataType: 'AWSDateTime',
            dataTypeValue: 'AWSDateTime',
            required: false,
            readOnly: true,
            isArray: false,
          },
          updatedAt: {
            dataType: 'AWSDateTime',
            dataTypeValue: 'AWSDateTime',
            required: false,
            readOnly: true,
            isArray: false,
          },
        },
      },
    },
    nonModels: {},
    enums: {},
  };
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

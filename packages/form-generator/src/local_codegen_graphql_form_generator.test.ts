import assert from 'assert';
import { it } from 'node:test';
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
  const l = new LocalGraphqlFormGenerator(async () => schema, {
    graphqlDir: '../graphql',
  });
  const forms = await l.generateForms();
  assert('PostCreateForm.jsx' in forms.components);
  assert('PostUpdateForm.jsx' in forms.components);
  assert(forms.components['PostCreateForm.jsx'].includes('React.useState'));
});

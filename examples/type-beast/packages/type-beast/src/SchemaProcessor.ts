// @ts-nocheck
import type { AmplifyApiSchemaPreprocessorOutput } from '@aws-amplify/graphql-construct-alpha';
import type { ModelSchema, ModelSchemaParamShape } from './ModelSchema';
import type { InternalField } from './ModelField';
import type { InternalRelationalField } from './ModelRelationalField';
import type { ModelType } from './ModelType';
import type { Prettify } from './util';

type ScalarFieldDef = Exclude<InternalField['data'], { fieldType: 'model' }>;
type ModelFieldDef = Extract<
  InternalRelationalField['data'],
  { fieldType: 'model' }
>;

function scalarFieldToGql(fieldDef: ScalarFieldDef, identifier?: string[]) {
  const {
    fieldType,
    optional,
    array,
    arrayOptional,
    default: _default,
  } = fieldDef;
  let field: string = fieldType;

  if (identifier !== undefined) {
    field += '!';
    if (identifier.length > 1) {
      const [_pk, ...sk] = identifier;
      field += ` @primaryKey(sortKeyFields: ${JSON.stringify(sk)})`;
    } else {
      field += ' @primaryKey';
    }
    return field;
  }

  if (optional === false) {
    field += '!';
  }

  if (array) {
    field = `[${field}]`;

    if (arrayOptional === false) {
      field += '!';
    }
  }

  if (_default !== undefined) {
    field += ` @default(value: ${_default})`;
  }

  return field;
}

function modelFieldToGql(fieldDef: ModelFieldDef) {
  const { type, relatedModel, array, valueOptional, arrayOptional } = fieldDef;

  let field = relatedModel;

  // TODO: once we flip default to nullable, uncomment
  // if (valueOptional === false) {
  //   field += "!";
  // }

  if (array) {
    field = `[${field}]`;
  }

  // TODO: once we flip default to nullable, uncomment
  // if (arrayOptional === false) {
  //   field += "!";
  // }

  field += ` @${type}`;

  return field;
}

export const schemaPreprocessor = <T extends ModelSchemaParamShape>(
  schema: ModelSchema<T>
) => {
  const gqlModels: string[] = [];

  for (const [modelName, modelDef] of Object.entries(schema.data.models)) {
    const gqlFields: string[] = [];

    const fields = modelDef.data.fields;
    const identifier = modelDef.data.identifier;
    const [partitionKey] = identifier;

    // process model and fields
    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      if (fieldDef.data.fieldType === 'model') {
        gqlFields.push(`${fieldName}: ${modelFieldToGql(fieldDef.data)}`);
      } else {
        if (fieldName === partitionKey) {
          gqlFields.push(
            `${fieldName}: ${scalarFieldToGql(fieldDef.data, identifier)}`
          );
        } else {
          gqlFields.push(`${fieldName}: ${scalarFieldToGql(fieldDef.data)}`);
        }
      }
    }

    const joined = gqlFields.join('\n  ');

    // const defaultAuth = '@auth(rules: [{allow: public}])';
    const rules = modelDef.data.authorization
      .map((rule) => {
        const ruleParts = [];

        if (rule.strategy) {
          ruleParts.push([`allow: ${rule.strategy}`]);
        } else {
          return null;
        }

        if (rule.provider) {
          ruleParts.push(`provider: ${rule.provider}`);
        }

        if (rule.operations) {
          ruleParts.push(`operations: [${rule.operations.join(', ')}]`);
        }

        if (rule.ownerField) {
          // does this need to be escaped?
          ruleParts.push(`ownerField: "${rule.ownerField}"`);
        }

        if (rule.groups) {
          // does `group` need to be escaped?
          ruleParts.push(
            `groups: [${rule.groups.map((group) => `"${group}"`).join(', ')}]`
          );
        }

        if (rule.groupsField) {
          // does this need to be escaped?
          ruleParts.push(`groupsField: "${rule.groupsField}"`);
        }

        // identityClaim
        // groupClaim

        return ruleParts.join(', ');
      })
      .filter((r) => r)
      .join(',');

    const auth = rules.length > 0 ? `@auth(rules: [${rules}])` : '';

    const model = `type ${modelName} @model ${auth}\n{\n  ${joined}\n}`;
    gqlModels.push(model);
  }

  const processedSchema = gqlModels.join('\n\n');

  return { processedSchema } as AmplifyApiSchemaPreprocessorOutput;
};

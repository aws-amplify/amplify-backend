import type { AmplifyApiSchemaPreprocessorOutput } from "@aws-amplify/graphql-construct-alpha";
import { default as TBSchema } from "../data";
import * as path from "path";
import * as fs from "fs";
import console = require("console");

type SchemaType = typeof TBSchema;

/**
 * Quick and dirty temporary schema processor that uses string interpolation
 * Will refactor to use GQL AST in the near future
 */

const MODEL_SCHEMA_PATH = path.resolve(
  __dirname,
  "../amplify/backend/api/dummy-api",
  "schema.graphql"
);

// TODO: these will come out of the shared type package
type FieldDef = Exclude<
  SchemaType["data"]["models"][string]["data"]["fields"][string]["data"],
  { fieldType: "model" }
>;

type ModelFieldDef = Extract<
  SchemaType["data"]["models"][string]["data"]["fields"][string]["data"],
  { fieldType: "model" }
>;

function scalarFieldToGql(fieldDef: FieldDef, identifier?: string[]) {
  const {
    fieldType,
    optional,
    array,
    arrayOptional,
    default: _default,
  } = fieldDef;
  let field: string = fieldType;

  if (identifier !== undefined) {
    field += "!";
    if (identifier.length > 1) {
      const [_pk, ...sk] = identifier;
      field += ` @primaryKey(sortKeyFields: ${JSON.stringify(sk)})`;
    } else {
      field += " @primaryKey";
    }
    return field;
  }

  if (optional === false) {
    field += "!";
  }

  if (array) {
    field = `[${field}]`;

    if (arrayOptional === false) {
      field += "!";
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

export const schemaPreprocessor = (schema: SchemaType) => {
  const gqlModels: string[] = [];

  for (const [modelName, modelDef] of Object.entries(schema.data.models)) {
    const gqlFields: string[] = [];

    const fields = modelDef.data.fields;
    const identifier = modelDef.data.identifier;
    const [partitionKey] = identifier;

    // process model and fields
    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      if (fieldDef.data.fieldType === "model") {
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

    const joined = gqlFields.join("\n  ");

    const defaultAuth = "@auth(rules: [{allow: public}])";

    const model = `type ${modelName} @model ${defaultAuth} {\n  ${joined}\n}`;
    gqlModels.push(model);
  }

  const processedSchema = gqlModels.join("\n\n");
  writeModelSchemaToFile(processedSchema);

  return { processedSchema } as AmplifyApiSchemaPreprocessorOutput;
};

function writeModelSchemaToFile(modelSchemaString: string) {
  try {
    fs.writeFileSync(MODEL_SCHEMA_PATH, modelSchemaString);
  } catch (err) {
    console.error(err);
  }
}

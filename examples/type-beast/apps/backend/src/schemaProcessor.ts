import * as path from 'path';
import * as fs from 'fs';
import { defineData, schemaPreprocessor } from 'type-beast';

/**
 * Quick and dirty temporary schema processor that uses string interpolation
 * Will refactor to use GQL AST in the near future
 */

const MODEL_SCHEMA_PATH = path.resolve(
  __dirname,
  '../amplify/backend/api/dummy-api',
  'schema.graphql'
);

export const schemaPreprocessorWrapper = (
  schema: ReturnType<typeof defineData>
) => {
  const { processedSchema } = schemaPreprocessor(schema);
  writeModelSchemaToFile(processedSchema);
  return { processedSchema };
};

function writeModelSchemaToFile(modelSchemaString: string) {
  try {
    fs.writeFileSync(MODEL_SCHEMA_PATH, modelSchemaString);
  } catch (err) {
    console.error(err);
  }
}

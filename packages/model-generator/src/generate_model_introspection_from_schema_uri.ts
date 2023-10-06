import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { createGraphqlModelsFromS3UriGenerator } from './create_graphql_models_generator.js';

/**
 * Root Schema Representation
 */
export type ModelIntrospectionSchema = {
  version: 1;
  models: SchemaModels;
  nonModels: SchemaNonModels;
  enums: SchemaEnums;
};

/**
 * Top-level Entities on a Schema
 */
export type SchemaModels = Record<string, SchemaModel>;
export type SchemaNonModels = Record<string, SchemaNonModel>;
export type SchemaEnums = Record<string, SchemaEnum>;

export type SchemaModel = {
  name: string;
  attributes?: ModelAttribute[];
  fields: Fields;
  pluralName: string;
  syncable?: boolean;
  primaryKeyInfo: PrimaryKeyInfo;
};
export type SchemaNonModel = {
  name: string;
  fields: Fields;
};
export type SchemaEnum = {
  name: string;
  values: string[];
};

export type ModelAttribute = {
  type: string;
  properties?: { [key: string]: any };
};
/**
 * Field Definition
 */
export type Fields = Record<string, Field>;
export type Field = {
  name: string;
  type: FieldType;
  isArray: boolean;
  isRequired: boolean;
  isReadOnly?: boolean;
  isArrayNullable?: boolean;
  attributes?: FieldAttribute[];
  association?: AssociationType;
};
export type FieldType =
  | 'ID'
  | 'String'
  | 'Int'
  | 'Float'
  | 'AWSDate'
  | 'AWSTime'
  | 'AWSDateTime'
  | 'AWSTimestamp'
  | 'AWSEmail'
  | 'AWSURL'
  | 'AWSIPAddress'
  | 'Boolean'
  | 'AWSJSON'
  | 'AWSPhone'
  | { enum: string }
  | { model: string }
  | { nonModel: string };
export type FieldAttribute = ModelAttribute;
/**
 * Field-level Relationship Definitions
 */
export enum CodeGenConnectionType {
  HAS_ONE = 'HAS_ONE',
  BELONGS_TO = 'BELONGS_TO',
  HAS_MANY = 'HAS_MANY',
}
export type AssociationBaseType = {
  connectionType: CodeGenConnectionType;
};

export type AssociationHasMany = AssociationBaseType & {
  connectionType: CodeGenConnectionType.HAS_MANY;
  associatedWith: string[];
};
export type AssociationHasOne = AssociationBaseType & {
  connectionType: CodeGenConnectionType.HAS_ONE;
  associatedWith: string[];
  targetNames: string[];
};

export type AssociationBelongsTo = AssociationBaseType & {
  connectionType: CodeGenConnectionType.BELONGS_TO;
  targetNames: string[];
};
export type AssociationType =
  | AssociationHasMany
  | AssociationHasOne
  | AssociationBelongsTo;

export type PrimaryKeyInfo = {
  isCustomPrimaryKey: boolean;
  primaryKeyFieldName: string;
  sortKeyFieldNames: string[];
};

export type GetModelIntrospectionSchemaParams = {
  modelSchemaS3Uri?: string;
  credentialProvider: AwsCredentialIdentityProvider;
};

/**
 * Try and convert the modelSchemaS3Uri into an introspection schema object.
 */
export const getModelIntrospectionSchemaFromS3Uri = async ({
  modelSchemaS3Uri,
  credentialProvider,
}: GetModelIntrospectionSchemaParams): Promise<
  ModelIntrospectionSchema | undefined
> => {
  if (!modelSchemaS3Uri) {
    return;
  }

  const modelGenerator = await createGraphqlModelsFromS3UriGenerator({
    modelSchemaS3Uri,
    credentialProvider,
  }).generateModels({ target: 'introspection' });
  const generatedModels = await modelGenerator.returnResults();

  const generatedModelFiles = Object.values(generatedModels);
  if (generatedModelFiles.length !== 1) {
    throw new Error(
      `A single model introspection schema is expected, received ${generatedModelFiles.length} values.`
    );
  }

  try {
    return JSON.parse(generatedModelFiles[0]);
  } catch (_) {
    throw new Error(
      'Caught exception while converting introspection schema to JSON representation'
    );
  }
};

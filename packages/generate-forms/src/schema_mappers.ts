import { GenericDataField, GenericDataSchema } from '@aws-amplify/codegen-ui';
import {
  CodegenGenericDataEnum,
  CodegenGenericDataField,
  CodegenGenericDataModel,
  CodegenGenericDataNonModel,
  CodegenGenericDataRelationshipType,
  CodegenJobGenericDataSchema,
} from '@aws-sdk/client-amplifyuibuilder';

type CodegenGenericDataFields = Record<string, CodegenGenericDataField>;
const mapRelationshipTypeToCodegen = (
  relationship: CodegenGenericDataRelationshipType | undefined
): CodegenGenericDataRelationshipType | undefined => {
  if (!relationship) return undefined;

  switch (relationship.type) {
    case 'HAS_MANY':
      return {
        type: 'HAS_MANY',
        relatedModelFields: relationship.relatedModelFields,
        canUnlinkAssociatedModel: !!relationship.canUnlinkAssociatedModel,
        relatedJoinFieldName: relationship.relatedJoinFieldName,
        relatedJoinTableName: relationship.relatedJoinTableName,
        belongsToFieldOnRelatedModel: relationship.belongsToFieldOnRelatedModel,
        relatedModelName: relationship.relatedModelName,
      };
    case 'HAS_ONE':
      return {
        type: 'HAS_ONE',
        associatedFields: relationship.associatedFields,
        isHasManyIndex: !!relationship.isHasManyIndex,
        relatedModelName: relationship.relatedModelName,
      };
    case 'BELONGS_TO':
      return {
        type: 'BELONGS_TO',
        associatedFields: relationship.associatedFields,
        isHasManyIndex: !!relationship.isHasManyIndex,
        relatedModelName: relationship.relatedModelName,
      };
    default:
      throw new Error('Invalid relationship type');
  }
};
const mapDataFieldsToCodegen = (fields: {
  [fieldName: string]: GenericDataField;
}): CodegenGenericDataFields => {
  const codegenFields: CodegenGenericDataFields = {};

  const parseData = (fieldValue): { type: string; value: string } => {
    if (
      typeof fieldValue.dataType === 'object' &&
      fieldValue.dataType !== null
    ) {
      if ('enum' in fieldValue.dataType) {
        return {
          type: 'Enum',
          value: fieldValue.dataType.enum,
        };
      } else if ('model' in fieldValue.dataType) {
        return { type: 'Model', value: fieldValue.dataType.model };
      } else if ('nonModel' in fieldValue.dataType) {
        return { type: 'NonModel', value: fieldValue.dataType.nonModel };
      }
    } else {
      return {
        type: fieldValue.dataType,
        value: fieldValue.dataType,
      };
    }
  };
  Object.entries(fields).forEach(([fieldKey, fieldValue]) => {
    const { type: dataType, value: dataTypeValue } = parseData(fieldValue);
    codegenFields[fieldKey] = {
      dataType: dataType,
      dataTypeValue: dataTypeValue,
      required: fieldValue.required,
      readOnly: fieldValue.readOnly,
      isArray: fieldValue.isArray,
    };
    if (fieldValue.relationship) {
      codegenFields[fieldKey].relationship = mapRelationshipTypeToCodegen(
        fieldValue.relationship
      );
    }
  });

  return codegenFields;
};
/**
 * Maps a graphql generic data schema to a form that can be understood by the UIBuilder service
 */
export const mapGenericDataSchemaToCodegen = (
  genericDataSchema: GenericDataSchema
): CodegenJobGenericDataSchema => {
  const { models, nonModels, enums, dataSourceType } = genericDataSchema;
  const codegenModels: { [key: string]: CodegenGenericDataModel } = {};
  const codegenNonModels: { [key: string]: CodegenGenericDataNonModel } = {};
  const codegenEnums: { [key: string]: CodegenGenericDataEnum } = {};

  Object.entries(models).forEach(([modelName, genericDataModel]) => {
    const modelFields = mapDataFieldsToCodegen(genericDataModel.fields);

    codegenModels[modelName] = {
      isJoinTable: genericDataModel.isJoinTable,
      primaryKeys: genericDataModel.primaryKeys,
      fields: modelFields,
    };
  });

  Object.entries(nonModels).forEach(([nonModelName, genericDataModel]) => {
    const nonModelFields = mapDataFieldsToCodegen(genericDataModel.fields);

    codegenNonModels[nonModelName] = {
      fields: nonModelFields,
    };
  });

  Object.entries(enums).forEach(([enumName, genericEnum]) => {
    codegenEnums[enumName] = {
      values: genericEnum.values,
    };
  });

  return {
    models: codegenModels,
    nonModels: codegenNonModels,
    enums: codegenEnums,
    dataSourceType,
  };
};

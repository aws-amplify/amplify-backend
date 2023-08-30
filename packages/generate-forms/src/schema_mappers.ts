import { GenericDataField, GenericDataSchema } from '@aws-amplify/codegen-ui';
import {
  CodegenGenericDataEnum,
  CodegenGenericDataField,
  CodegenGenericDataFieldDataType,
  CodegenGenericDataModel,
  CodegenGenericDataNonModel,
  CodegenGenericDataRelationshipType,
  CodegenJobGenericDataSchema,
} from '@aws-sdk/client-amplifyuibuilder';

type CodegenGenericDataFields = Record<string, CodegenGenericDataField>;
/**
 *
 */
export const mapRelationshipTypeToCodegen = (
  relationship: CodegenGenericDataRelationshipType | undefined,
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
/**
 *
 */
export const mapDataFieldsToCodegen = (fields: {
  [fieldName: string]: GenericDataField;
}): CodegenGenericDataFields => {
  const codegenFields: CodegenGenericDataFields = {};

  Object.entries(fields).forEach(([fieldName, dataField]) => {
    let dataType: CodegenGenericDataFieldDataType;
    let dataTypeValue = '';
    if (typeof dataField.dataType === 'object' && dataField.dataType !== null) {
      if ('enum' in dataField.dataType) {
        dataType = 'Enum';
        dataTypeValue = dataField.dataType.enum;
      } else if ('model' in dataField.dataType) {
        dataType = 'Model';
        dataTypeValue = dataField.dataType.model;
      } else if ('nonModel' in dataField.dataType) {
        dataType = 'NonModel';
        dataTypeValue = dataField.dataType.nonModel;
      }
    } else {
      dataType = dataField.dataType;
      dataTypeValue = dataField.dataType;
    }
    codegenFields[fieldName] = {
      dataType: dataType!,
      dataTypeValue: dataTypeValue,
      required: dataField.required,
      readOnly: dataField.readOnly,
      isArray: dataField.isArray,
    };
    if (dataField.relationship) {
      codegenFields[fieldName].relationship = mapRelationshipTypeToCodegen(
        dataField.relationship,
      );
    }
  });

  return codegenFields;
};
/**
 *
 */
export const mapGenericDataSchemaToCodegen = (
  genericDataSchema: GenericDataSchema,
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


import { parse } from 'graphql';
import { getBaseType } from 'graphql-transformer-common';

export const parseSchema = (schema: string) => {
  const parsedSchema = parse(schema);
  const tables: any = [];
  const types = parsedSchema.definitions.filter((definition: any) => definition.kind === 'ObjectTypeDefinition');

  types.forEach((type: any) => {  
    if (!type.directives?.find((directive: any) => directive.name.value === 'model')) {
      return;
    }
    const primaryKey = type.fields.find((field: any) => field.directives && field.directives.some((directive: any) => directive.name.value === 'primaryKey'));
    const fields = type.fields.map((field: any) => {
      const fieldType = getMappedType(getBaseType(field.type));
      return {
        name: field.name.value,
        type: `${fieldType}${fieldType === 'VARCHAR' ? '(255)' : ''}`,
        isNullable: false,
      };
    });
    tables.push({ tableName: type.name.value, columns: fields, primaryKey: primaryKey ? [primaryKey.name.value] : [] });
  });

  return {
    tables
  };
};

export const getMappedType = (type: string) => {
  switch (type) {
    case 'String':
      return 'VARCHAR';
    case 'Int':
      return 'Int';
    case 'Float':
      return 'FLOAT';
    case 'Boolean':
      return 'BOOLEAN';
    case 'ID':
      return 'UUID';
    default:
      return 'VARCHAR';
  }
};

export const generateSqlSchema = (schema: any): any => {
  const { schema: gqlSchema } = schema.transform();
  return parseSchema(gqlSchema);
}
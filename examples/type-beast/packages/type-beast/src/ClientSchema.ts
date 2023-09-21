import type { Authorization, ImpliedAuthFields } from './Authorization';
import type { Prettify, UnionToIntersection, ExcludeEmpty } from './util';
import type { ModelField } from './ModelField';
import type {
  ModelRelationalField,
  ModelRelationalFieldParamShape,
} from './ModelRelationalField';
import type { ModelType, ModelTypeParamShape } from './ModelType';
import type { ModelSchema } from './ModelSchema';
import { __modelMeta__ } from '@aws-amplify/types-package-alpha';

/**
 * Types for unwrapping generic type args into client-consumable types
 *
 * @typeParam Schema - Type Beast schema type
 *
 * The following params are used solely as variables in order to simplify mapped type usage.
 * They should not receive external type args.
 *
 * @typeParam Fields - flattened Schema/Models/Fields structure with field type params extracted
 * @typeParam FieldsWithRelationships - Fields + resolved relational fields
 * @typeParam ResolvedFields - optionality enforced on nullable types (+?); These are the client-facing types used for CRUDL response shapes
 *
 * @typeParam Meta - Stores schema metadata: identifier, relationship metadata;
 * used by `API.generateClient` to craft strongly typed mutation inputs; hidden from customer-facing types behind __modelMeta__ symbol
 *
 */
export type ClientSchema<
  Schema extends ModelSchema<any>,
  // Todo: rename Fields to FlattenedSchema
  Fields = FieldTypes<ModelTypes<SchemaTypes<Schema>>>,
  FieldsWithRelationships = ResolveRelationships<Fields>,
  ResolvedFields = Intersection<
    FilterFieldTypes<RequiredFieldTypes<FieldsWithRelationships>>,
    FilterFieldTypes<OptionalFieldTypes<FieldsWithRelationships>>,
    FilterFieldTypes<ModelImpliedAuthFields<Schema>>
  >,
  Meta = ModelMeta<SchemaTypes<Schema>> &
    ExtractRelationalMetadata<Fields, ResolvedFields>
> = Prettify<
  ResolvedFields & {
    [__modelMeta__]: Meta;
  }
>;

type ExtractRelationalMetadata<Fields, ResolvedFields> = UnionToIntersection<
  ExcludeEmpty<
    {
      [ModelName in keyof Fields]: {
        [Field in keyof Fields[ModelName] as Fields[ModelName][Field] extends ModelRelationalFieldParamShape
          ? Fields[ModelName][Field]['relationshipType'] extends 'hasMany'
            ? Fields[ModelName][Field]['relatedModel']
            : never
          : never]: Fields[ModelName][Field] extends ModelRelationalFieldParamShape
          ? ModelName extends keyof ResolvedFields
            ? {
                relationships: Partial<
                  Record<
                    `${Lowercase<ModelName & string>}${Capitalize<
                      Field & string
                    >}Id`,
                    string
                  >
                >;
              }
            : never
          : never;
      };
    }[keyof Fields]
  >
>;

type SchemaTypes<T> = T extends ModelSchema<infer R> ? R['models'] : never;

export type ModelTypes<Schema> = {
  [Property in keyof Schema]: Schema[Property] extends ModelType<infer R, any>
    ? R['fields']
    : never;
};

type ModelMeta<T> = {
  [Property in keyof T]: T[Property] extends ModelType<infer R, any>
    ? // reduce back to union
      R['identifier'] extends any[]
      ? { identifier: R['identifier'][number] }
      : never
    : never;
};

type ModelImpliedAuthFields<Schema extends ModelSchema<any>> = {
  [ModelKey in keyof Schema['data']['models']]: Schema['data']['models'][ModelKey] extends ModelType<
    infer Model,
    any
  >
    ? ImpliedAuthFields<Model['authorization'][number]> &
        ImpliedAuthFieldsFromFields<Model>
    : {};
};

type ImpliedAuthFieldsFromFields<T> = UnionToIntersection<
  T extends ModelTypeParamShape
    ? T['fields'][keyof T['fields']] extends
        | ModelField<any, any, infer Auth>
        | ModelRelationalField<any, any, any, infer Auth>
      ? Auth extends Authorization<any, any>
        ? ImpliedAuthFields<Auth>
        : {}
      : {}
    : {}
>;

/**
 * infer and massage field types
 */

type GetRelationshipRef<
  T,
  RM extends keyof T,
  TypeArg extends ModelRelationalFieldParamShape,
  ResolvedModel = ResolveRelationalFieldsForModel<T, RM>,
  Model = TypeArg['valueOptional'] extends true
    ? ResolvedModel | null | undefined
    : ResolvedModel,
  Value = TypeArg['array'] extends true
    ? TypeArg['arrayOptional'] extends true
      ? Array<Model> | null | undefined
      : Array<Model>
    : Model
  // future: we can add an arg here for pagination and other options
> = () => Promise<Prettify<Value>>;

type ResolveRelationalFieldsForModel<Schema, ModelName extends keyof Schema> = {
  [FieldName in keyof Schema[ModelName]]: Schema[ModelName][FieldName] extends ModelRelationalFieldParamShape
    ? Schema[ModelName][FieldName]['relatedModel'] extends keyof Schema
      ? GetRelationshipRef<
          Schema,
          Schema[ModelName][FieldName]['relatedModel'],
          Schema[ModelName][FieldName]
        >
      : never
    : Schema[ModelName][FieldName];
};

type ResolveRelationships<Schema> = {
  [ModelProp in keyof Schema]: {
    [FieldProp in keyof Schema[ModelProp]]: Schema[ModelProp][FieldProp] extends ModelRelationalFieldParamShape
      ? Schema[ModelProp][FieldProp]['relatedModel'] extends keyof Schema
        ? GetRelationshipRef<
            Schema,
            Schema[ModelProp][FieldProp]['relatedModel'],
            Schema[ModelProp][FieldProp]
          >
        : never // if the field value extends ModelRelationalFieldShape "relatedModel" should always point to a Model (keyof Schema)
      : Schema[ModelProp][FieldProp];
  };
};

type FieldTypes<T> = {
  [ModelProp in keyof T]: {
    [FieldProp in keyof T[ModelProp]]: T[ModelProp][FieldProp] extends ModelRelationalField<
      infer R,
      string,
      never,
      any
    >
      ? R
      : T[ModelProp][FieldProp] extends ModelField<infer R, any, any>
      ? R
      : never;
  };
};

type FilterFieldTypes<Schema> = {
  [ModelProp in keyof Schema]: {
    [FieldProp in keyof Schema[ModelProp] as Schema[ModelProp][FieldProp] extends undefined
      ? never
      : FieldProp]: Schema[ModelProp][FieldProp];
  };
};

type OptionalFieldTypes<Schema> = {
  [ModelProp in keyof Schema]: Partial<{
    [FieldProp in keyof Schema[ModelProp]]: null extends Schema[ModelProp][FieldProp]
      ? Schema[ModelProp][FieldProp]
      : never;
  }>;
};

type RequiredFieldTypes<Schema> = {
  [ModelProp in keyof Schema]: {
    [FieldProp in keyof Schema[ModelProp]]: null extends Schema[ModelProp][FieldProp]
      ? never
      : Schema[ModelProp][FieldProp];
  };
};

type Intersection<A, B, C> = A & B & C extends infer U
  ? { [P in keyof U]: U[P] }
  : never;

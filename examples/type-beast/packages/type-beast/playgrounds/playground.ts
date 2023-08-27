import { default as a, defineData } from '../index';

import type { ModelSchema } from '../src/ModelSchema';
import { type ModelType } from '../src/ModelType';
import type { ModelField, InternalField } from '../src/ModelField';
import type {
  ModelRelationalField,
  ModelRelationalFieldParamShape,
} from '../src/ModelRelationalField';
import type { Prettify, UnionToIntersection, ExcludeEmpty } from '../src/util';
import { __modelMeta__ } from '@aws-amplify/types-package-alpha';

const schema = a.schema({
  Blog: a
    .model({
      id: a.id(),
      title: a.string(),
      posts: a.hasMany('Post'),
    })
    .identifier(['id']),
  Post: a
    .model({
      id: a.id(),
      title: a.string(),
      viewCount: a.integer().optional(),
      comments: a.hasMany('Comment'),
    })
    .identifier(['id']),
  Comment: a.model({
    id: a.id(),
    bingo: a.string(),
    anotherField: a.string().optional(),
    subComments: a.hasMany('SubComment'),
  }),
  SubComment: a.model({
    id: a.id(),
    bingo: a.string(),
    anotherField: a.string().optional(),
    subSubComments: a.hasMany('SubSubComment'),
  }),
  SubSubComment: a.model({
    id: a.id(),
    bingo: a.string(),
    anotherField: a.string().optional(),
  }),
});

type TSchema = typeof schema;
export type Schema = ClientSchema<TSchema>;

type MMeta = Schema[typeof __modelMeta__];

type ClientSchema<
  Schema extends ModelSchema<any>,
  // Todo: rename Fields to FlattenedSchema
  Fields = FieldTypes<ModelTypes<SchemaTypes<Schema>>>,
  FieldsWithRelationships = ResolveRelationships<Fields>,
  ResolvedFields = Intersection<
    FilterFieldTypes<RequiredFieldTypes<FieldsWithRelationships>>,
    FilterFieldTypes<OptionalFieldTypes<FieldsWithRelationships>>
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

type ModelTypes<Schema> = {
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

type FFields = Prettify<FieldTypes<ModelTypes<SchemaTypes<TSchema>>>>;
type FieldsWithRelationships = Prettify<ResolveRelationships<FFields>>;

type FieldTypes<T> = {
  [ModelProp in keyof T]: {
    [FieldProp in keyof T[ModelProp]]: T[ModelProp][FieldProp] extends ModelRelationalField<
      infer R,
      string,
      never
    >
      ? R
      : T[ModelProp][FieldProp] extends ModelField<infer R, any>
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

type Intersection<A, B> = A & B extends infer U
  ? { [P in keyof U]: U[P] }
  : never;

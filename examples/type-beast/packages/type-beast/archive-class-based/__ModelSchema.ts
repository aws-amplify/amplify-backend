import type { ModelTypeOmit, ModelTypeShape, ModelType } from "./__ModelType";
import type { ModelFieldOmit, ModelField } from "./__ModelField";
import type {
  ModelRelationalFieldOmit,
  ModelRelationalField,
  ModelRelationshipTypes,
  ModelRelationalFieldShape,
} from "./__relationships";

/*
 * Notes:
 *
 * branded types
 *
 * if we want to use symbol to conceal metadata,
 * we may need a common types-only package that TB and API cat depend on
 *
 * TSC output diagnostics to benchmark
 */

/**
 * Custom Selection Set DX ideas
 *
 * 1. type Post<["field 1", "field2"]> = Schema["Post"];
 * 2. SelectionSet<Post, ["fiel1", "field2"]>
 * 3. type SelectionSet<Post, ["fiel1", "field2"]> = Schema["SelectionSet"]
 */

type ModelSchemaModels = Record<string, ModelTypeOmit<ModelTypeShape>>;

export type ModelSchemaShape = {
  models: ModelSchemaModels;
  // TODO: add other schema-level props
};

export class ModelSchema<T extends ModelSchemaShape> {
  private _models: ModelSchemaModels;

  constructor(models: ModelSchemaModels) {
    this._models = models;
  }
}

export type ModelSchemaType<T extends ModelSchemaShape> = typeof ModelSchema<T>;

export function schema<Models extends ModelSchemaModels>(
  models: Models
): ModelSchema<{ models: Models }> {
  return new ModelSchema(models);
}

/**
 * Types for unwrapping generics into client-consumable types
 */

export type ClientSchema<T> = Prettify<
  // ResolveRelationships<
  Intersection<
    FilterFieldTypes<
      RequiredFieldTypes<FieldTypes<ModelTypes<SchemaTypes<T>>>>
    >,
    FilterFieldTypes<OptionalFieldTypes<FieldTypes<ModelTypes<SchemaTypes<T>>>>>
  >
  // >
>;

type GetRelationshipRef<
  T,
  RM extends keyof T,
  Optional extends boolean = false
> = Optional extends true ? T[RM] | null : T[RM];

type ResolveRelationships<T> = {
  [ModelProp in keyof T]: {
    [FieldProp in keyof T[ModelProp]]: T[ModelProp][FieldProp] extends ModelRelationalFieldShape
      ? T[ModelProp][FieldProp]["relatedModel"] extends keyof T
        ? T[ModelProp][FieldProp]["array"] extends true
          ? Array<
              GetRelationshipRef<
                T,
                T[ModelProp][FieldProp]["relatedModel"],
                T[ModelProp][FieldProp]["optional"]
              >
            >
          : GetRelationshipRef<T, T[ModelProp][FieldProp]["relatedModel"]>
        : never // if the field value extends ModelRelationalFieldShape "relatedModel" should always point to a Model (keyof T)
      : T[ModelProp][FieldProp];
  };
};

type Prettify<T> = T extends object ? { [P in keyof T]: Prettify<T[P]> } : T;

type SchemaTypes<T> = T extends ModelSchema<infer R> ? R["models"] : never;

type ModelTypes<T> = {
  [Property in keyof T]: T[Property] extends ModelType<infer R>
    ? R["fields"]
    : T[Property] extends ModelTypeOmit<infer R>
    ? R["fields"]
    : never;
};

/**
 * infer and massage field types
 */

type FieldTypes<T> = {
  [ModelProp in keyof T]: {
    [FieldProp in keyof T[ModelProp]]: T[ModelProp][FieldProp] extends ModelField<
      infer R
    >
      ? R
      : T[ModelProp][FieldProp] extends ModelRelationalField<
          infer R,
          any,
          any,
          any
        >
      ? R
      : T[ModelProp][FieldProp] extends ModelFieldOmit<
          infer R,
          keyof ModelField<T>
        >
      ? R
      : T[ModelProp][FieldProp] extends ModelRelationalFieldOmit<
          infer R,
          any,
          any,
          any
        >
      ? R
      : never;
  };
};

type FilterFieldTypes<T> = {
  [ModelProp in keyof T]: {
    [FieldProp in keyof T[ModelProp] as T[ModelProp][FieldProp] extends undefined
      ? never
      : FieldProp]: T[ModelProp][FieldProp];
  };
};

type OptionalFieldTypes<T> = {
  [ModelProp in keyof T]: Partial<{
    [FieldProp in keyof T[ModelProp]]: null extends T[ModelProp][FieldProp]
      ? T[ModelProp][FieldProp]
      : never;
  }>;
};

type RequiredFieldTypes<T> = {
  [ModelProp in keyof T]: {
    [FieldProp in keyof T[ModelProp]]: null extends T[ModelProp][FieldProp]
      ? never
      : T[ModelProp][FieldProp];
  };
};

type Intersection<A, B> = A & B extends infer U
  ? { [P in keyof U]: U[P] }
  : never;

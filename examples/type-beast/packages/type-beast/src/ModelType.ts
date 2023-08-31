import type { ModelField, InternalField } from './ModelField';
import type {
  ModelRelationalField,
  InternalRelationalField,
} from './ModelRelationalField';
import {
  authBuilder,
  AuthBuilderChain,
  AuthorizationFor,
} from './authorization';
import type { SetTypeSubArg } from './util';

type ModelFields = Record<
  string,
  ModelField<any, any> | ModelRelationalField<any, string, any>
>;

type InternalModelFields = Record<
  string,
  InternalField | InternalRelationalField
>;

type ModelData = {
  fields: ModelFields;
  identifier: string[];
  authorization: any | undefined;
};

type InternalModelData = ModelData & {
  fields: InternalModelFields;
  identifier: string[];
};

export type ModelTypeParamShape = {
  fields: ModelFields;
  identifier: string[];
};

type ExtractType<T extends ModelTypeParamShape> = {
  [FieldProp in keyof T['fields']]: T['fields'][FieldProp] extends ModelField<
    infer R,
    any
  >
    ? R
    : never;
};

type GetRequiredFields<T> = {
  [FieldProp in keyof T as T[FieldProp] extends NonNullable<T[FieldProp]>
    ? FieldProp
    : never]: T[FieldProp];
};

type IdentifierMap<T extends ModelTypeParamShape> = GetRequiredFields<
  ExtractType<T>
>;

// extracts model fields that CAN BE used as identifiers (scalar, non-nullable fields)
// TODO: make this also filter out all non-scalars e.g., model fields and custom types
type IdentifierFields<T extends ModelTypeParamShape> = keyof IdentifierMap<T> &
  string;

type IdentifierType<
  T extends ModelTypeParamShape,
  Fields extends string = IdentifierFields<T>
> = Array<Fields>;

export type ModelType<
  T extends ModelTypeParamShape,
  K extends keyof ModelType<T> = never
> = Omit<
  {
    identifier<ID extends IdentifierType<T> = []>(
      identifier: ID
    ): ModelType<SetTypeSubArg<T, 'identifier', ID>, K | 'identifier'>;

    // NOTE: We will need to pass fields through to authorization here as well
    // so that a
    authorization(
      rules: AuthBuilderChain<T['fields']>
    ): ModelType<T, K | 'authorization'>;
  },
  K
>;

/**
 * Internal representation of Model Type that exposes the `data` property.
 * Used at buildtime.
 */
export type InternalModel = ModelType<any> & {
  data: InternalModelData;
};

function _model<T extends ModelTypeParamShape>(fields: T['fields']) {
  const data: ModelData = {
    fields,
    identifier: ['id'],
    authorization: undefined,
  };

  const builder: ModelType<T> = {
    identifier(identifier) {
      data.identifier = identifier;

      return this;
    },
    authorization(rules) {
      data.authorization = rules(authBuilder(fields));

      return this;
    },
  };

  return { ...builder, data } as InternalModel as ModelType<T>;
}

export function model<T extends ModelFields>(
  fields: T
): ModelType<{ fields: T; identifier: Array<'id'> }> {
  return _model(fields);
}

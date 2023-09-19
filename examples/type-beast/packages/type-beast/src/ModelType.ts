import { ModelField, InternalField, fields } from './ModelField';
import type {
  ModelRelationalField,
  InternalRelationalField,
} from './ModelRelationalField';
import { Authorization, ImpliedAuthFields } from './Authorization';
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
  authorization: Authorization<any, any>[];
};

type InternalModelData = ModelData & {
  fields: InternalModelFields;
  identifier: string[];
  // TODO: change back to `Authorization<any, any>[]` after defineData change.
  authorization: any;
};

export type ModelTypeParamShape = {
  fields: ModelFields;
  identifier: string[];
  authorization: Authorization<any, any>[];
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

/**
 * For a given ModelTypeParamShape, produces a map of Authorization rules
 * that would *conflict* with the given type.
 *
 * E.g.,
 *
 * ```
 * const test = {
 *  fields: {
 *   title: fields.string(),
 *   otherfield: fields.string().array(),
 *   numfield: fields.integer(),
 *  },
 *  identifier: [],
 *  authorization: [],
 * };
 *
 * ConflictingAuthRulesMap<typeof test> === {
 *  title: Authorization<"title", true>;
 *  otherfield: Authorization<"otherfield", false>;
 *  numfield: Authorization<"numfield", true> | Authorization<"numfield", false>;
 * }
 * ```
 */
type ConflictingAuthRulesMap<T extends ModelTypeParamShape> = {
  [K in keyof ExtractType<T>]: K extends string
    ? string extends ExtractType<T>[K]
      ? Authorization<K, true>
      : string[] extends ExtractType<T>[K]
      ? Authorization<K, false>
      : Authorization<K, true> | Authorization<K, false>
    : never;
};

/**
 * For a given ModelTypeParamShape, produces a union of Authorization rules
 * that would *conflict* with the given type.
 *
 * E.g.,
 *
 * ```
 * const test = {
 *  fields: {
 *   title: fields.string(),
 *   otherfield: fields.string().array(),
 *   numfield: fields.integer(),
 *  },
 *  identifier: [],
 *  authorization: [],
 * };
 *
 * ConflictingAuthRules<typeof test> ===
 *  Authorization<"title", true>
 *  | Authorization<"otherfield", false>
 *  | Authorization<"numfield", true> | Authorization<"numfield", false>
 * ;
 * ```
 */
type ConflictingAuthRules<T extends ModelTypeParamShape> =
  ConflictingAuthRulesMap<T>[keyof ConflictingAuthRulesMap<T>];

export type ModelType<
  T extends ModelTypeParamShape,
  K extends keyof ModelType<T> = never
> = Omit<
  {
    identifier<ID extends IdentifierType<T> = []>(
      identifier: ID
    ): ModelType<SetTypeSubArg<T, 'identifier', ID>, K | 'identifier'>;
    authorization<AuthRuleType extends Authorization<any, any>>(
      rules: Exclude<AuthRuleType, ConflictingAuthRules<T>>[]
    ): ModelType<
      SetTypeSubArg<T, 'authorization', AuthRuleType[]>,
      K | 'authorization'
    >;
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
    authorization: [],
  };

  const builder: ModelType<T> = {
    identifier(identifier) {
      data.identifier = identifier;

      return this;
    },
    authorization(rules) {
      data.authorization = rules;

      return this;
    },
  };

  return { ...builder, data } as InternalModel as ModelType<T>;
}

export function model<T extends ModelFields>(
  fields: T
): ModelType<{ fields: T; identifier: Array<'id'>; authorization: [] }> {
  return _model(fields);
}

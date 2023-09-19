import { Prettify, SetTypeSubArg } from './util';
import { Authorization } from './Authorization';

/**
 * Used to "attach" auth types to ModelField without exposing them on the builder.
 */
export const __auth = Symbol('__auth');

export enum ModelRelationshipTypes {
  hasOne = 'hasOne',
  hasMany = 'hasMany',
  belongsTo = 'belongsTo',
  manyToMany = 'manyToMany',
}

type RelationshipTypes = `${ModelRelationshipTypes}`;

const arrayTypeRelationships = ['hasMany', 'manyToMany'];

type ModelRelationalFieldData = {
  fieldType: 'model';
  type: ModelRelationshipTypes;
  relatedModel: string;
  array: boolean;
  valueOptional: boolean;
  arrayOptional: boolean;
  authorization: Authorization<any, any>[];
};

export type ModelRelationalFieldParamShape = {
  type: 'model';
  relationshipType: string;
  relatedModel: string;
  valueOptional: boolean;
  array: boolean;
  arrayOptional: boolean;
};

export type ModelRelationalField<
  T extends ModelRelationalFieldParamShape,
  // RM adds structural separation with ModelField; easier to identify it when mapping to ClientTypes
  RM extends string | symbol,
  K extends keyof ModelRelationalField<T, RM> = never,
  Auth = undefined
> = Omit<
  {
    valueOptional(): ModelRelationalField<
      SetTypeSubArg<T, 'valueOptional', true>,
      K | 'valueOptional'
    >;
    arrayOptional(): ModelRelationalField<
      SetTypeSubArg<T, 'arrayOptional', true>,
      K | 'arrayOptional'
    >;
    authorization<AuthRuleType extends Authorization<any, any>>(
      rules: AuthRuleType[]
    ): ModelRelationalField<T, K | 'authorization', K, AuthRuleType>;
  },
  K
> & {
  // This is a lie. This property is never set at runtime. It's just used to smuggle auth types through.
  [__auth]?: Auth;
};

/**
 * Internal representation of Model Field that exposes the `data` property.
 * Used at buildtime.
 */
export type InternalRelationalField = ModelRelationalField<
  ModelRelationalFieldParamShape,
  string,
  never
> & {
  data: ModelRelationalFieldData;
};

function _modelRelationalField<
  T extends ModelRelationalFieldParamShape,
  RelatedModel extends string,
  RT extends ModelRelationshipTypes
>(type: RT, relatedModel: RelatedModel) {
  const data: ModelRelationalFieldData = {
    relatedModel,
    type,
    fieldType: 'model',
    array: false,
    valueOptional: false,
    arrayOptional: false,
    authorization: [],
  };

  if (arrayTypeRelationships.includes(type)) {
    data.array = true;
  }

  const builder: ModelRelationalField<T, RelatedModel> = {
    valueOptional() {
      data.valueOptional = true;

      return this;
    },
    arrayOptional() {
      data.arrayOptional = true;

      return this;
    },
    authorization(rules) {
      data.authorization = rules;

      return this;
    },
  };

  return {
    ...builder,
    data,
  } as InternalRelationalField as ModelRelationalField<T, RelatedModel>;
}

type ModelRelationalTypeArgFactory<
  RM extends string,
  RT extends RelationshipTypes,
  IsArray extends boolean
> = {
  type: 'model';
  relatedModel: RM;
  relationshipType: RT;
  array: IsArray;
  valueOptional: false;
  arrayOptional: false;
};

export function hasOne<RM extends string>(relatedModel: RM) {
  return _modelRelationalField<
    ModelRelationalTypeArgFactory<RM, ModelRelationshipTypes.hasOne, false>,
    RM,
    ModelRelationshipTypes.hasOne
  >(ModelRelationshipTypes.hasOne, relatedModel);
}

export function hasMany<RM extends string>(relatedModel: RM) {
  return _modelRelationalField<
    ModelRelationalTypeArgFactory<RM, ModelRelationshipTypes.hasMany, true>,
    RM,
    ModelRelationshipTypes.hasMany
  >(ModelRelationshipTypes.hasMany, relatedModel);
}

export function belongsTo<RM extends string>(relatedModel: RM) {
  return _modelRelationalField<
    ModelRelationalTypeArgFactory<RM, ModelRelationshipTypes.belongsTo, false>,
    RM,
    ModelRelationshipTypes.belongsTo
  >(ModelRelationshipTypes.belongsTo, relatedModel);
}

export function manyToMany<RM extends string>(relatedModel: RM) {
  return _modelRelationalField<
    ModelRelationalTypeArgFactory<RM, ModelRelationshipTypes.manyToMany, true>,
    RM,
    ModelRelationshipTypes.manyToMany
  >(ModelRelationshipTypes.manyToMany, relatedModel);
}

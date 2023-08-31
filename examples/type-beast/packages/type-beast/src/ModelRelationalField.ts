import { Prettify, SetTypeSubArg } from './util';
// import type { TempAuthParam } from './authorization';

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
  RM extends string,
  K extends keyof ModelRelationalField<T, RM> = never
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
    authorization(auth: any): ModelRelationalField<T, K | 'authorization'>;
  },
  K
>;

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
    authorization() {
      // TODO: implement

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

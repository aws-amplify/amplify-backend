export enum ModelRelationshipTypes {
  hasOne = "hasOne",
  hasMany = "hasMany",
  belongsTo = "belongsTo",
  manyToMany = "manyToMany",
}

export type ModelRelationalFieldShape = {
  type: "model";
  relatedModel: string;
  optional: boolean;
  array: boolean;
};

// TODO: extract into shared types
type Prettify<T> = T extends object ? { [P in keyof T]: Prettify<T[P]> } : T;

export type ModelRelationalFieldOmit<
  T extends ModelRelationalFieldShape,
  RelatedModel extends string,
  RT extends ModelRelationshipTypes,
  Excluded extends keyof ModelRelationalField<T, RelatedModel, RT> = any
> = Omit<ModelRelationalField<T, RelatedModel, RT, Excluded>, Excluded>;

export class ModelRelationalField<
  T extends ModelRelationalFieldShape,
  RelatedModel extends string,
  RT extends ModelRelationshipTypes,
  Excluded extends keyof ModelRelationalField<
    ModelRelationalFieldShape,
    RelatedModel,
    RT
  > = never
> {
  private _fieldType = "model" as const;
  private _type: RT;
  private _relatedModel: string;
  private _optional: boolean = false;
  private _array: boolean = false;

  constructor(type: RT, relatedModel: RelatedModel) {
    this._type = type;
    this._relatedModel = relatedModel;

    if (["hasMany", "manyToMany"].includes(type)) {
      this._array = true;
    }
  }

  public optional() {
    this._optional = true;

    return this as ModelRelationalFieldOmit<
      Prettify<
        {
          type: "model";
          optional: true;
          relatedModel: RelatedModel;
        } & { array: T["array"] }
      >,
      RelatedModel,
      RT,
      Excluded | "optional"
    >;
  }
}

export function hasOne<RM extends string>(relatedModel: RM) {
  return new ModelRelationalField<
    {
      type: "model";
      optional: false;
      relatedModel: RM;
      array: false;
    },
    RM,
    ModelRelationshipTypes.hasOne
  >(ModelRelationshipTypes.hasOne, relatedModel);
}

export function hasMany<RM extends string>(relatedModel: RM) {
  return new ModelRelationalField<
    {
      type: "model";
      optional: true;
      relatedModel: RM;
      array: true;
    },
    RM,
    ModelRelationshipTypes.hasMany
  >(ModelRelationshipTypes.hasMany, relatedModel);
}

export function belongsTo<RM extends string>(relatedModel: RM) {
  return new ModelRelationalField<
    {
      type: "model";
      optional: false;
      relatedModel: RM;
      array: false;
    },
    RM,
    ModelRelationshipTypes.belongsTo
  >(ModelRelationshipTypes.belongsTo, relatedModel);
}

export function manyToMany<RM extends string>(relatedModel: RM) {
  return new ModelRelationalField<
    {
      type: "model";
      optional: false;
      relatedModel: RM;
      array: true;
    },
    RM,
    ModelRelationshipTypes.manyToMany
  >(ModelRelationshipTypes.manyToMany, relatedModel);
}

const hm = hasOne("Blog");

// Scratchpad - TODO: delete tests types before pushing
type Test = typeof hm extends ModelRelationalField<any, any, infer R>
  ? R
  : typeof hm extends ModelRelationalFieldOmit<any, any, infer R>
  ? R
  : never;

type Test2 = Prettify<
  {
    type: "model";
    relatedModel: string;
    optional: false;
    array: false;
  } & { relatedModel: "Comment"; array: true }
>;

type Test3 = Prettify<{ type: "model"; optional: true } & { optional: false }>;

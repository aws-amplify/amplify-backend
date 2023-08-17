type RelationalMethods = "hasOne" | "hasMany" | "belongsTo" | "manyToMany";

type ModelRefTypeParamShape = {
  model: string;
  relationshipType?: RelationalMethods;
};

type ModelRefData = {
  model: string;
  optional: boolean;
  array: boolean;
  relationshipType?: RelationalMethods;
};

export type ModelRef<
  T extends ModelRefTypeParamShape,
  K extends keyof ModelRef<T> = never
> = Omit<
  {
    hasOne(): ModelRef<
      T & { relationshipType: "hasOne" },
      K | RelationalMethods
    >;
    hasMany(): ModelRef<
      T & { relationshipType: "hasMany" },
      K | RelationalMethods
    >;
    belongsTo(): ModelRef<
      T & { relationshipType: "belongsTo" },
      K | RelationalMethods
    >;
    manyToMany(): ModelRef<
      T & { relationshipType: "manyToMany" },
      K | RelationalMethods
    >;
  },
  K
>;

export type InternalModelRef = ModelRef<any> & {
  data: ModelRefData;
};

function _ref<T extends ModelRefTypeParamShape>(model: T["model"]) {
  const data: ModelRefData = {
    model,
    optional: false,
    array: false,
  };

  const builder: ModelRef<T> = {
    hasOne() {
      data.relationshipType = "hasOne";

      return this;
    },
    hasMany() {
      data.relationshipType = "hasMany";

      return this;
    },
    belongsTo() {
      data.relationshipType = "belongsTo";

      return this;
    },
    manyToMany() {
      data.relationshipType = "manyToMany";

      return this;
    },
  };

  return { ...builder, data } as InternalModelRef as ModelRef<T>;
}

export function ref<T extends string>(model: T): ModelRef<{ model: T }> {
  return _ref(model);
}

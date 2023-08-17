// @lib: esnext

const schema = a.schema({
  // ...more models
  Order: a
    .model({
      country: a.string(),
      orderId: a.autoUuid(),
      // ...more fields
    })
    .identifier(["country", "orderId"]),
});

type Order = InferType<typeof schema, "Order">;

//#region lib code

type Prettify<T> = T extends object ? { [P in keyof T]: Prettify<T[P]> } : T;

type SchemaDef = Record<string, ModelDef<any>>;
type ModelDef<SD extends SchemaDef> =
  | Record<keyof SD, FieldDef<any>>
  | { identifier(fields: any[]): any };
type BuiltSchema<SD extends SchemaDef> = {
  client: {
    models: { [k in keyof SD]: SD[k] };
  };
};
type BuiltModel<SD extends SchemaDef, MD extends ModelDef<SD>> = {
  [k in keyof MD as k]: MD[k];
} & { identifier<K extends keyof MD>(fields: K[]): BuiltModel<SD, MD> };

type FieldDef<T, O extends boolean = false> = {
  type: TypesMap<T> | "model";
  isArray?: boolean;
  optional: O;
};
type TypesMap<T> = T extends string ? "string" : never;

type ModelKeys<BS extends BuiltSchema<any>> = BS extends BuiltSchema<infer SD>
  ? keyof SD
  : never;

type InferType<
  SD extends BuiltSchema<any>,
  MN extends keyof SD["client"]["models"]
> = {
  [k in keyof SD["client"]["models"][MN] as k extends "identifier"
    ? never
    : k]: SD["client"]["models"][MN][k]["model"] extends keyof SD["client"]["models"]
    ? SD["client"]["models"][MN][k]["type"] extends "model"
      ? SD["client"]["models"][MN][k]["isArray"] extends true
        ? Array<Prettify<InferType<SD, SD["client"]["models"][MN][k]["model"]>>>
        : Prettify<InferType<SD, SD["client"]["models"][MN][k]["model"]>>
      : never
    : SD["client"]["models"][MN][k]["optional"] extends false
    ? H<SD["client"]["models"][MN][k]["type"]>
    : H<SD["client"]["models"][MN][k]["type"]> | undefined;
};

type H<T extends string> = T extends "model" ? never : T;

declare const a: {
  schema<SD extends SchemaDef>(schemaDef: SD): BuiltSchema<SD>;
  model<SD extends SchemaDef, MD extends ModelDef<SD>>(
    modelDef: MD
  ): BuiltModel<SD, MD>;
  string(): FieldDef<string>;
  autoUuid(): FieldDef<string>;
  hasMany<SD extends SchemaDef, MN extends keyof SD, O extends boolean = false>(
    relatedModel: MN,
    optional?: O
  ): Prettify<{ model: MN } & { type: "model"; isArray: true; optional: O }>;
  belongsTo<SD extends SchemaDef, MN extends keyof SD>(
    relatedModel: MN
  ): Prettify<
    { model: MN } & { type: "model"; isArray: false; optional: false }
  >;
};

//#endregion

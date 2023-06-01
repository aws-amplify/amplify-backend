/**
 * @fileoverview safe-to-ignore fake module file
 */

/**
 * Fake TypeBeast module definition
 */
declare module '@aws-amplify/type-beast' {
  /**
   * Sample scalar builder
   */
  type ScalarBuilder<T> = {
    isOptional: boolean;
    optional: () => ScalarBuilder<T>;
    type: T;
  };

  /**
   * Sample scalar type
   */
  type Scalar = {
    string: () => ScalarBuilder<string>;
    boolean: () => ScalarBuilder<boolean>;
    number: () => ScalarBuilder<number>;
    date: () => ScalarBuilder<Date>;
  };

  /**
   * Sample Model type
   */
  type Model = {
    [property: string]: ScalarBuilder<any>;
  };

  /**
   * Sample schema definition type
   */
  export type SchemaDefinition = {};

  type Models = {
    [model: string]: Model;
  };
  type ModelProperties = {
    [property: string]: ScalarBuilder<string | number | boolean | Date>;
  };

  function schema(models: Models): SchemaDefinition;
  function model(properties: ModelProperties): Model;

  type A = {
    schema: typeof schema;
    model: typeof model;
  } & Scalar;

  export const a: A;
}

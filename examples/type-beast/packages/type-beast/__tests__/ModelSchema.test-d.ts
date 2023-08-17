import { Equal, Expect } from "../src/util";
import { type ModelType, type InternalModel, model } from "../src/ModelType";
import { type ModelField, type InternalField, fields } from "../src/ModelField";
import {
  type ModelSchema,
  type InternalSchema,
  schema,
} from "../src/ModelSchema";

type GetModelTypeArg<T> = T extends ModelType<infer R, any> ? R : never;

const { string, id } = fields;

/**
 * Test todos:
 *
 * relationships
 * auth
 *
 */

describe("basic functionality", () => {
  const { id, string } = fields;

  test("basic ModelSchema can be cast to InternalSchema", () => {
    const s = schema({
      Post: model({
        id: id(),
        title: string(),
      }),
    });
  });
});

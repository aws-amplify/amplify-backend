import { Equal, Expect } from '../src/util';
import { type ModelType, type InternalModel, model } from '../src/ModelType';
import { type ModelField, type InternalField, fields } from '../src/ModelField';

type GetModelTypeArg<T> = T extends ModelType<infer R, any> ? R : never;

const { string, id } = fields;

/**
 * Test todos:
 *
 * relationships
 * auth
 *
 */

describe('InternalModel casting', () => {
  test('basic ModelType can be cast to InternalModel', () => {
    const m = model({
      title: string(),
    });

    // @ts-expect-error
    const data = m.data;

    const internalModel = m as InternalModel;
    internalModel.data;
  });

  test('ModelType with options can be cast to InternalModel', () => {
    const m = model({
      title: string(),
      description: string().optional(),
    }).identifier(['title']);

    // @ts-expect-error
    const data = m.data;

    const internalModel = m as InternalModel;
    internalModel.data;
  });
});

describe('identifiers', () => {
  test('model() with fields and default id produces expected type args', () => {
    const m = model({
      title: string().optional(),
    });

    type MT = GetModelTypeArg<typeof m>;

    type ExpectedType = {
      fields: {
        // id: ModelField<string>;
        title: ModelField<string | null, 'optional'>;
      };
      identifier: Array<'id'>;
      authorization: [];
    };

    type test = Expect<Equal<MT, ExpectedType>>;
  });

  test('model() with fields and custom id produces expected type args', () => {
    const m = model({
      customId: id(),
    }).identifier(['customId']);

    type MT = GetModelTypeArg<typeof m>;

    type ExpectedType = {
      fields: {
        customId: ModelField<string>;
      };
      identifier: Array<'customId'>;
      authorization: [];
    };

    type test = Expect<Equal<MT, ExpectedType>>;

    const m2 = model({
      customId: id(),
      title: string().optional(),
    });

    // optional fields can't be used as identifier
    // @ts-expect-error
    m2.identifier(['title']);
  });
});

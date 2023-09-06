import { Equal, Expect, Prettify } from '../src/util';
import { type ModelType, type InternalModel, model } from '../src/ModelType';
import { type ModelField, type InternalField, fields } from '../src/ModelField';
import {
  type ModelRelationalField,
  type InternalRelationalField,
} from '../src/ModelRelationalField';

type GetModelTypeArg<T> = T extends ModelType<infer R, any> ? R : never;

type FullInternalFieldType = (
  | ModelField<any, any>
  | ModelRelationalField<any, string, any>
) &
  (InternalField | InternalRelationalField);

const { string, id } = fields;

/**
 * Test todos:
 *
 * relationships
 * auth
 *
 */

describe('basic functionality', () => {
  test.only('basic ModelType can be cast to InternalModel', () => {
    const m = model({
      title: string(),
    });

    // @ts-expect-error
    const data = m.data;

    const internalModel = m as InternalModel;
    internalModel.data;

    type internalField = (typeof internalModel.data.fields)[string];
    type test = Expect<Equal<FullInternalFieldType, internalField>>;

    type fieldData = internalField['data'];
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

    type internalField = (typeof internalModel.data.fields)[string];
    type test = Expect<Equal<FullInternalFieldType, internalField>>;

    type fieldData = internalField['data'];
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

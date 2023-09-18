import type {
  ModelType,
  ModelTypeParamShape,
  InternalModel,
} from './ModelType';
export { __auth } from './ModelField';
import type { Prettify } from './util';

/*
 * Notes:
 *
 * TSC output diagnostics to benchmark
 */

type ModelSchemaModels = Record<string, ModelType<ModelTypeParamShape, any>>;
type InternalSchemaModels = Record<string, InternalModel>;

export type ModelSchemaParamShape = {
  models: ModelSchemaModels;
};

type ModelSchemaData = {
  models: ModelSchemaModels;
};

export type InternalSchema = {
  data: {
    models: InternalSchemaModels;
  };
};

export type ModelSchema<T extends ModelSchemaParamShape> = {
  data: T;
};

function _schema<T extends ModelSchemaParamShape>(models: T['models']) {
  const data: ModelSchemaData = { models };

  return { data } as ModelSchema<T>;
}

export function schema<Models extends ModelSchemaModels>(
  models: Models
): ModelSchema<{ models: Models }> {
  return _schema(models);
}

export function defineData(arg: { schema: ModelSchema<any> }) {
  return arg.schema as InternalSchema;
}

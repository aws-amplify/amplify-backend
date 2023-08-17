import type { ModelFieldOmit, ModelField } from "./__ModelField";
import type {
  ModelRelationalFieldOmit,
  ModelRelationalField,
} from "./__relationships";
import type { TempAuthParam } from "../src/authorization";

type ModelIdentifier = "id" | string | string[];

export type ModelTypeShape = {
  fields: ModelTypeFields;
  // TODO: add other model-level props
};

export type ModelTypeOmit<
  T extends ModelTypeShape,
  Excluded extends keyof ModelType<ModelTypeShape> = any
> = Omit<ModelType<T, Excluded>, Excluded>;

export type ModelTypeFields = Record<
  string,
  | ModelFieldOmit<unknown>
  | ModelField<unknown>
  | ModelRelationalFieldOmit<any, any, any>
  | ModelRelationalField<any, any, any>
>;

class ModelType<
  T extends ModelTypeShape,
  Excluded extends keyof ModelType<ModelTypeShape> = never
> {
  private _fields: ModelTypeFields;
  private _identifier: ModelIdentifier = "id";
  private _authorization: TempAuthParam | undefined;

  constructor(fields: T["fields"]) {
    this._fields = fields;
  }

  public identifier(identifier: string | string[]) {
    this._identifier = identifier;

    return this as ModelTypeOmit<T, Excluded | "identifier">;
  }

  public authorization(authorization: TempAuthParam) {
    this._authorization = authorization;

    return this as ModelTypeOmit<T, Excluded | "authorization">;
  }
}

export function model<T extends ModelTypeFields>(
  fields: T
): ModelType<{ fields: T }> {
  return new ModelType(fields);
}

export type { ModelType };

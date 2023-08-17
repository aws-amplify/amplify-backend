export enum ModelFieldType {
  Id = "ID",
  String = "String",
  Integer = "Int",
  Float = "Float",
  Boolean = "Boolean",
  Date = "AWSDate",
  Time = "AWSTime",
  DateTime = "AWSDateTime",
  Timestamp = "AWSTimestamp",
  Email = "AWSEmail",
  JSON = "AWSJSON",
  Phone = "AWSPhone",
  Url = "AWSURL",
  IPAddress = "AWSIPAddress",
}

export enum ModelFieldDataType {
  String = "string",
  Number = "number",
  Boolean = "boolean",
  Date = "Date",
  JSON = "any",
}

export type ModelFieldOmit<
  T,
  Excluded extends keyof ModelField<unknown> = any
> = Omit<ModelField<T, Excluded>, Excluded>;

type Prettify<T> = T extends object ? { [P in keyof T]: Prettify<T[P]> } : T;

export class ModelField<T, Excluded extends keyof ModelField<unknown> = never> {
  private _fieldType: ModelFieldType;
  private _optional: boolean = false;
  private _array: boolean = false;
  private _arrayOptional: boolean = false;
  private _default: string | undefined;
  private _lastMethod: keyof ModelField<unknown> | undefined;

  constructor(fieldType: ModelFieldType) {
    this._fieldType = fieldType;
  }

  public optional() {
    this._optional = true;

    if (this._lastMethod === "array") {
      this._arrayOptional = true;
    }

    this._lastMethod = "optional";
    return this as ModelFieldOmit<T | null, Excluded | "optional">;
  }

  public array() {
    this._array = true;

    this._lastMethod = "array";
    return this as ModelFieldOmit<
      Array<T>,
      "array" | Exclude<Excluded, "optional">
    >;
  }

  public default(val: string) {
    this._default = val;

    this._lastMethod = "default";
    // last chained method; exclude all methods
    return this as ModelFieldOmit<T, Excluded | keyof ModelField<unknown>>;
  }
}

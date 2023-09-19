import { Brand } from './util';
import { Authorization, __data } from './Authorization';

/**
 * Used to "attach" auth types to ModelField without exposing them on the builder.
 */
export const __auth = Symbol('__auth');

export enum ModelFieldType {
  Id = 'ID',
  String = 'String',
  Integer = 'Int',
  Float = 'Float',
  Boolean = 'Boolean',
  Date = 'AWSDate',
  Time = 'AWSTime',
  DateTime = 'AWSDateTime',
  Timestamp = 'AWSTimestamp',
  Email = 'AWSEmail',
  JSON = 'AWSJSON',
  Phone = 'AWSPhone',
  Url = 'AWSURL',
  IPAddress = 'AWSIPAddress',
}

export enum ModelFieldDataType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Date = 'Date',
  JSON = 'any',
}

type FieldMeta = {
  lastInvokedMethod: null | keyof ModelField<ModelFieldTypeParamOuter>;
};

type FieldData = {
  fieldType: ModelFieldType;
  optional: boolean;
  array: boolean;
  arrayOptional: boolean;
  default: undefined | string;
  authorization: Authorization<any, any>[];
};

type ModelFieldTypeParamInner = string | number | boolean | Date | null;
type ModelFieldTypeParamOuter =
  | ModelFieldTypeParamInner
  | Array<ModelFieldTypeParamInner>
  | null;

type ToArray<T> = [T] extends [ModelFieldTypeParamInner] ? Array<T> : never;

/**
 * Public API for the chainable builder methods exposed by Model Field.
 * The type is narrowing e.g., after calling .array() it will be omitted from intellisense suggestions
 *
 * @typeParam T - holds the JS data type of the field
 * @typeParam K - union of strings representing already-invoked method names. Used to improve Intellisense
 */
export type ModelField<
  T extends ModelFieldTypeParamOuter,
  // rename K
  K extends keyof ModelField<T> = never,
  Auth = undefined
> = Omit<
  {
    optional(): ModelField<T | null, K | 'optional'>;
    // Exclude `optional` after calling array, because both the value and the array itself can be optional
    array(): ModelField<ToArray<T>, Exclude<K, 'optional'> | 'array'>;
    default(val: string): ModelField<T, K | 'default'>;
    authorization<AuthRuleType extends Authorization<any, any>>(
      rules: AuthRuleType[]
    ): ModelField<T, K | 'authorization', AuthRuleType>;
  },
  K
> & {
  // This is a lie. This property is never set at runtime. It's just used to smuggle auth types through.
  [__auth]?: Auth;
};

/**
 * Internal representation of Model Field that exposes the `data` property.
 * Used at buildtime.
 */
export type InternalField = ModelField<ModelFieldTypeParamOuter, never> & {
  data: FieldData;
};

/**
 * Model Field Implementation
 *
 * @typeParam T - holds the JS data type of the field; invoking the public methods changes this type accordingly
 * @example
 * string() => T = string
 * string().array() => T = string[]
 * string().array().optional() => T = string[] | null
 * string().optional().array().optional() => T = (string | null)[] | null
 *
 * @param fieldType - stores the GraphQL data type of the field
 */
function _field<T extends ModelFieldTypeParamOuter>(fieldType: ModelFieldType) {
  const _meta: FieldMeta = {
    lastInvokedMethod: null,
  };

  const data: FieldData = {
    fieldType,
    optional: false,
    array: false,
    arrayOptional: false,
    default: undefined,
    authorization: [],
  };

  const builder: ModelField<T> = {
    optional() {
      if (_meta.lastInvokedMethod === 'array') {
        data.arrayOptional = true;
      } else {
        data.optional = true;
      }

      _meta.lastInvokedMethod = 'optional';

      return this;
    },
    array(): ModelField<ToArray<T>> {
      data.array = true;
      _meta.lastInvokedMethod = 'array';

      return this;
    },
    default(val) {
      data.default = val;
      _meta.lastInvokedMethod = 'default';

      return this;
    },
    authorization(rules) {
      data.authorization = rules;
      _meta.lastInvokedMethod = 'authorization';

      return this;
    },
  };

  // this double cast gives us a Subtyping Constraint i.e., hides `data` from the public API,
  // but makes it available internally when needed
  return { ...builder, data } as InternalField as ModelField<T>;
}

function id(): ModelField<string> {
  return _field(ModelFieldType.Id);
}

function string(): ModelField<string> {
  return _field(ModelFieldType.String);
}

function integer(): ModelField<number> {
  return _field(ModelFieldType.Integer);
}

function float(): ModelField<number> {
  return _field(ModelFieldType.Float);
}

function boolean(): ModelField<boolean> {
  return _field(ModelFieldType.Boolean);
}

function date(): ModelField<Date> {
  return _field(ModelFieldType.Date);
}

function time(): ModelField<Date> {
  return _field(ModelFieldType.Time);
}

function datetime(): ModelField<Date> {
  return _field(ModelFieldType.DateTime);
}

function timestamp(): ModelField<number> {
  return _field(ModelFieldType.Timestamp);
}

function email(): ModelField<string> {
  return _field(ModelFieldType.Email);
}

function json(): ModelField<any> {
  return _field(ModelFieldType.JSON);
}

function phone(): ModelField<string> {
  return _field(ModelFieldType.Phone);
}

function url(): ModelField<string> {
  return _field(ModelFieldType.Url);
}

function ipAddress(): ModelField<string> {
  return _field(ModelFieldType.IPAddress);
}

export const fields = {
  id,
  string,
  integer,
  float,
  boolean,
  date,
  time,
  datetime,
  timestamp,
  email,
  json,
  phone,
  url,
  ipAddress,
};

import { Equal, Expect } from "../src/util";
import { type ModelField, type InternalField, fields } from "../src/ModelField";

type GetFieldTypeArg<T> = T extends ModelField<infer R, any> ? R : never;

const {
  string,
  id,
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
} = fields;

/**
 * Test todos:
 *
 * auth
 *
 */

test("string() produces expected type args", () => {
  const field = string();
  type Field = GetFieldTypeArg<typeof field>;

  type basicTest = Expect<Equal<Field, string>>;

  // @ts-expect-error
  type basicTest2 = Expect<Equal<FT, number>>;

  const fieldOpt = string().optional();
  type FieldOpt = GetFieldTypeArg<typeof fieldOpt>;

  type optTest = Expect<Equal<FieldOpt, string | null>>;

  const fieldArr = string().array();
  type fieldArr = GetFieldTypeArg<typeof fieldArr>;

  type arrTest = Expect<Equal<fieldArr, string[]>>;

  const fieldOptArray = string().optional().array();
  type FieldOptArray = GetFieldTypeArg<typeof fieldOptArray>;

  type optArrTest = Expect<Equal<FieldOptArray, (string | null)[]>>;

  const fieldOptArrayOpt = string().optional().array().optional();
  type FieldOptArrayOpt = GetFieldTypeArg<typeof fieldOptArrayOpt>;

  type optArrOptTest = Expect<
    Equal<FieldOptArrayOpt, (string | null)[] | null>
  >;
});

test("ModelField can be cast to InternalField", () => {
  const field = string().optional();

  // @ts-expect-error
  field.data;

  const internalField = field as InternalField;
  internalField.data;
});

test("all basic scalar fields produce expected type args", () => {
  type FieldTypeMap = {
    id: string;
    integer: number;
    float: number;
    boolean: boolean;
    date: Date;
    time: Date;
    datetime: Date;
    timestamp: number;
    email: string;
    json: any;
    phone: string;
    url: string;
    ipAddress: string;
  };

  const _id = id();
  type FieldId = GetFieldTypeArg<typeof _id>;

  type basicTestId = Expect<Equal<FieldId, FieldTypeMap["id"]>>;

  const _integer = integer();
  type FieldInt = GetFieldTypeArg<typeof _integer>;

  type basicTestInt = Expect<Equal<FieldInt, FieldTypeMap["integer"]>>;

  const _float = float();
  type FieldFloat = GetFieldTypeArg<typeof _float>;

  type basicTestFloat = Expect<Equal<FieldInt, FieldTypeMap["float"]>>;

  const _boolean = boolean();
  type FieldBool = GetFieldTypeArg<typeof _boolean>;

  type basicTestBool = Expect<Equal<FieldBool, FieldTypeMap["boolean"]>>;

  const _date = date();
  type FieldDate = GetFieldTypeArg<typeof _date>;

  type basicTestData = Expect<Equal<FieldDate, FieldTypeMap["date"]>>;

  const _time = time();
  type FieldTime = GetFieldTypeArg<typeof _time>;

  type basicTestTime = Expect<Equal<FieldTime, FieldTypeMap["time"]>>;

  const _datetime = datetime();
  type FieldDateTime = GetFieldTypeArg<typeof _datetime>;

  type basicTestDateTime = Expect<
    Equal<FieldDateTime, FieldTypeMap["datetime"]>
  >;

  const _timestamp = timestamp();
  type FieldTimestamp = GetFieldTypeArg<typeof _timestamp>;

  type basicTestFieldTimestamp = Expect<
    Equal<FieldTimestamp, FieldTypeMap["timestamp"]>
  >;

  const _email = email();
  type FieldEmail = GetFieldTypeArg<typeof _email>;

  type basicTestEmail = Expect<Equal<FieldEmail, FieldTypeMap["email"]>>;

  const _json = json();
  type FieldJson = GetFieldTypeArg<typeof _json>;

  type basicTestJson = Expect<Equal<FieldJson, FieldTypeMap["json"]>>;

  const _phone = phone();
  type FieldPhone = GetFieldTypeArg<typeof _phone>;

  type basicTestPhone = Expect<Equal<FieldPhone, FieldTypeMap["phone"]>>;

  const _url = url();
  type FieldUrl = GetFieldTypeArg<typeof _url>;

  type basicTestUrl = Expect<Equal<FieldUrl, FieldTypeMap["url"]>>;

  const _ipAddress = ipAddress();
  type FieldIP = GetFieldTypeArg<typeof _ipAddress>;

  type basicTestIP = Expect<Equal<FieldIP, FieldTypeMap["ipAddress"]>>;
});

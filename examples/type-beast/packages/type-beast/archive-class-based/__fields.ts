import { ModelField, ModelFieldType } from "./__ModelField";

export function id(): ModelField<string> {
  return new ModelField(ModelFieldType.Id);
}

export function string(): ModelField<string> {
  return new ModelField(ModelFieldType.String);
}

export function integer(): ModelField<number> {
  return new ModelField(ModelFieldType.Integer);
}

export function float(): ModelField<number> {
  return new ModelField(ModelFieldType.Float);
}

export function boolean(): ModelField<boolean> {
  return new ModelField(ModelFieldType.Boolean);
}

export function date(): ModelField<Date> {
  return new ModelField(ModelFieldType.Date);
}

export function time(): ModelField<Date> {
  return new ModelField(ModelFieldType.Time);
}

export function datetime(): ModelField<Date> {
  return new ModelField(ModelFieldType.DateTime);
}

export function timestamp(): ModelField<number> {
  return new ModelField(ModelFieldType.Timestamp);
}

export function email(): ModelField<string> {
  return new ModelField(ModelFieldType.Email);
}

export function json(): ModelField<any> {
  return new ModelField(ModelFieldType.JSON);
}

export function phone(): ModelField<string> {
  return new ModelField(ModelFieldType.Phone);
}

export function url(): ModelField<string> {
  return new ModelField(ModelFieldType.Url);
}

export function ipAddress(): ModelField<string> {
  return new ModelField(ModelFieldType.IPAddress);
}

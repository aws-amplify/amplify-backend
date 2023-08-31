import type { ClientSchema } from './src/ModelSchema';
import { schema, defineData } from './src/ModelSchema';
import { model } from './src/ModelType';
import { fields } from './src/ModelField';
import { ref } from './src/ModelRef';
import {
  hasOne,
  hasMany,
  belongsTo,
  manyToMany,
} from './src/ModelRelationalField';
import { allow } from './src/authorization';

const a = {
  schema,
  model,
  ref,
  hasOne,
  hasMany,
  belongsTo,
  manyToMany,
  allow,
  ...fields,
};

export default a;

export { defineData };

export type { ClientSchema };

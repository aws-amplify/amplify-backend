import { type ClientSchema, defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
export const backend = defineBackend({
  auth,
  data,
});

/**
 * IDE hints:
 * let dataSchema: ModelSchema<{   types: {     Todo: ModelType<SetTypeSubArg<{       fields: {         content: ModelField<Nullable<string>, never, undefined>       }       identifier: 'id'[]       secondaryIndexes: []       authorization: []     }, 'authorization', (Authorization<...> & {})[]>, 'authorization'>
 *
 * This means that schema type can be passed through defineData -> backend -> access backend props.
 */
let dataSchema = backend.data.schema;

import type { Schema } from './data/resource';
import { getAuthClient } from '@aws-amplify/backend-seed';
import { Amplify } from 'aws-amplify';
import * as auth from 'aws-amplify/auth';
import * as storage from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/api';

// TSX eats this but the compiler is unhappy about going up the directory hierarchy.
// Perhaps seed should live closer to outputs and frontend code rather than backend.
// @ts-ignore
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);

// TODO typings for outputs could be better?
// This is really kind-of auth admin api SDK
const authClient = getAuthClient(outputs['auth'] as never);

const dataClient = generateClient<Schema>();

await dataClient.models.Todo.create({
  content: `Todo@${Math.random().toString()}`,
});

const user1 = await authClient.createUser(
  `user${Math.random().toString()}@amazon.com`,
  `P@ssword${Math.random().toString()}`
);

const user2 = await authClient.createUser(
  `user${Math.random().toString()}@amazon.com`,
  `P@ssword${Math.random().toString()}`
);

await auth.signIn({
  username: user1.username,
  password: user1.password,
});

let response = await dataClient.models.Todo.create(
  {
    content: `Todo@${user1?.username ?? ''}@${Math.random().toString()}`,
  },
  {
    authMode: 'userPool',
  }
);
if (response.errors && response.errors.length > 0) {
  throw response.errors;
}

await auth.signOut();

await auth.signIn({
  username: user2.username,
  password: user2.password,
});

response = await dataClient.models.Todo.create(
  {
    content: `Todo@${user2?.username ?? ''}@${Math.random().toString()}`,
  },
  {
    authMode: 'userPool',
  }
);
if (response.errors && response.errors.length > 0) {
  throw response.errors;
}

const uploadTask = storage.uploadData({
  data: `Some Content ${Math.random().toString()}`,
  path: `foo/${Math.random().toString()}`,
});

await uploadTask.result;

const s3Items = await storage.list({
  path: 'foo/',
  options: {
    pageSize: 1000,
  },
});

console.log('######## S3 Items ########');
console.log(s3Items.items);
console.log('##########################');

await auth.signOut();

const todos = await dataClient.models.Todo.list({
  limit: 1000,
});

console.log('####### Data Items #######');
console.log(todos.data);
console.log('##########################');

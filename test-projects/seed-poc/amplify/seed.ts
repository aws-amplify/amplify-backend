// TODO: importing as type doesn't trigger synthesis, otherwise it does and it's failing.
// Synthesis is not needed for seed, seed depends on post-deployment artifacts (client config).
import type { backend } from './backend';

import { defineSeed } from '@aws-amplify/backend';
import type { Schema } from './data/resource';
import { defineSeed2, KeysByType, PickByType } from '@aws-amplify/backend-seed';
import { SchemaSeedable, Seedable } from '@aws-amplify/plugin-types';

defineSeed<Schema>(async (dataClient, authClient) => {
  console.log('Inside seed function');
  await dataClient.models.Todo.create({
    content: `Random todo item ${Math.random().toString()}`,
  });

  await authClient.createUser(
    `user${Math.random().toString()}@amazon.com`,
    `P@ssword${Math.random().toString()}`
  );
});

defineSeed2<typeof backend, Schema>(async (clients) => {
  console.log('Inside seed function 2');
  await clients.data.models.Todo.create({
    content: `Random todo item ${Math.random().toString()}`,
  });

  await clients.auth.createUser(
    `user${Math.random().toString()}@amazon.com`,
    `P@ssword${Math.random().toString()}`
  );
});

let foo: PickByType<typeof backend, Seedable<'auth'>>;
let bar: PickByType<typeof backend, Seedable<'data'>>;

let foo2: KeysByType<typeof backend, Seedable<'auth'>>;
let bar2: KeysByType<typeof backend, Seedable<'data'>>;

// TODO: importing as type doesn't trigger synthesis, otherwise it does and it's failing.
// Synthesis is not needed for seed, seed depends on post-deployment artifacts (client config).
import type { backend } from './backend';

import { defineSeed } from '@aws-amplify/backend';
import type { Schema } from './data/resource';

defineSeed<Schema>(async (dataClient, authClient) => {
  console.log('Inside seed function');
  await dataClient.models.Todo.create({
    content: `Random todo item ${Math.random().toString()}`,
  });

  await authClient.createUser(
    `user${Math.random().toString()}`,
    `password${Math.random().toString()}`
  );
});

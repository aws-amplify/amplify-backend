import type { Schema } from './data/resource';
import { defineSeed4 } from '@aws-amplify/backend-seed';
import { generateClient } from 'aws-amplify/data';

defineSeed4(async (authClient) => {
  const dataClient = generateClient<Schema>();

  await dataClient.models.Todo.create({
    content: `Todo@${Math.random().toString()}`,
  });

  const user1 = await authClient?.createUser(
    `user${Math.random().toString()}@amazon.com`,
    `P@ssword${Math.random().toString()}`
  );

  const user2 = await authClient?.createUser(
    `user${Math.random().toString()}@amazon.com`,
    `P@ssword${Math.random().toString()}`
  );

  if (user1) {
    await authClient?.executeAsUser(user1, async () => {
      const response = await dataClient.models.Todo.create(
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
    });
  }

  if (user2) {
    await authClient?.executeAsUser(user2, async () => {
      const response = await dataClient.models.Todo.create(
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
    });
  }

  const todos = await dataClient.models.Todo.list({
    limit: 1000,
  });

  console.log(todos.data);
});

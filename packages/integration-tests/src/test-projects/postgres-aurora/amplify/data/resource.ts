import { defineData, aurora } from '@aws-amplify/backend-data';
import { schema } from './schema.js';

export const data = defineData({
  schema,
  database: {
    provider: aurora({
      provision: {
        databaseName: 'testdb',
        minCapacity: 0.5,
        maxCapacity: 1,
      },
    }),
  },
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: { expiresInDays: 7 },
  },
});

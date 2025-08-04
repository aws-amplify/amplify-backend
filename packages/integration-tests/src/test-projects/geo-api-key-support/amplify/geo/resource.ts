import {
  defineMap,
  defineCollection,
  definePlace,
} from '@aws-amplify/backend-geo';

export const map = defineMap({
  name: 'integrationTestMap',
  access: (allow) => [allow.authenticated.to(['get'])],
});

export const place = definePlace({
  name: 'integrationTestPlaceIndex',
  access: (allow) => [
    allow.authenticated.to(['search']),
    allow.guest.to(['geocode']),
    allow.apiKey.to(['autocomplete']),
  ],
  apiKeyProps: {
    apiKeyName: 'integrationTestIndexKey',
  },
});

export const collection = defineCollection({
  name: 'integrationTestCollection',
  description:
    'This is a geofence collection setup for integration testing purposes.',
  access: (allow) => [
    allow.authenticated.to(['create', 'read', 'update', 'delete']),
    allow.guest.to(['read', 'list']),
  ],
});

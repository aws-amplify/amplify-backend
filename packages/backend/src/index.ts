export * from './backend.js';
export * from './secret.js';

// re-export core functionality from category packages

// data
export { defineData } from '@aws-amplify/backend-graphql';
export { type ClientSchema, a } from '@aws-amplify/amplify-api-next-alpha';

// auth
export { defineAuth } from '@aws-amplify/backend-auth';

// storage
export { defineStorage } from '@aws-amplify/backend-storage';

// function
export { Func } from '@aws-amplify/backend-function';

export * from './backend.js';
export { defineBackend } from './backend_factory.js';
export * from './secret.js';

// re-export core functionality from category packages

// data
export { defineData } from '@aws-amplify/backend-data';
export { a, type ClientSchema } from '@aws-amplify/data-schema';

// auth
export { defineAuth } from '@aws-amplify/backend-auth';

// storage
export { defineStorage } from '@aws-amplify/backend-storage';

// function
export { defineFunction } from '@aws-amplify/backend-function';

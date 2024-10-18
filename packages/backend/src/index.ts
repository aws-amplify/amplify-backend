import { isBrowser } from './is_browser.js';

if (isBrowser()) {
  throw new Error(
    'This package is for backend use only and should not be used in a browser environment.'
  );
}

export { defineBackend } from './backend_factory.js';
export * from './backend.js';
export * from './secret.js';

// re-export core functionality from category packages

// data
export { defineData } from '@aws-amplify/backend-data';
export { type ClientSchema, a } from '@aws-amplify/data-schema';

// auth
export { defineAuth, referenceAuth } from '@aws-amplify/backend-auth';

// storage
export { defineStorage } from '@aws-amplify/backend-storage';

// function
export { defineFunction } from '@aws-amplify/backend-function';

export { defineBackend } from './backend_factory.js';
export * from './backend.js';
export * from './secret.js';

// re-export core functionality from category packages

// data
export { defineData } from '@aws-amplify/backend-data';
export { type ClientSchema, a } from '@aws-amplify/data-schema';

// auth
export { defineAuth } from '@aws-amplify/backend-auth';

// storage
export { defineStorage } from '@aws-amplify/backend-storage';

// function
export { defineFunction } from '@aws-amplify/backend-function';

// re-export trigger types as "<category><trigger>Handler"
export type {
  CustomMessageTriggerHandler as AuthCustomMessageHandler,
  PreAuthenticationTriggerHandler as AuthPreAuthenticationHandler,
  PreSignUpTriggerHandler as AuthPreSignUpHandler,
  PostAuthenticationTriggerHandler as AuthPostAuthenticationHandler,
  PostConfirmationTriggerHandler as AuthPostConfirmationHandler,
  UserMigrationTriggerHandler as AuthUserMigrationHandler,
  S3Handler as StorageHandler,
  AppSyncResolverHandler as DataResolverHandler,
} from 'aws-lambda';

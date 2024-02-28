export * from './factory.js';

// re-export trigger types as "<category><trigger>Handler"
export type {
  CustomMessageTriggerHandler as AuthCustomMessageHandler,
  PreAuthenticationTriggerHandler as AuthPreAuthenticationHandler,
  PreSignUpTriggerHandler as AuthPreSignUpHandler,
  PostAuthenticationTriggerHandler as AuthPostAuthenticationHandler,
  PostConfirmationTriggerHandler as AuthPostConfirmationHandler,
  UserMigrationTriggerHandler as AuthUserMigrationHandler,
  S3Handler as StorageHandler,
} from 'aws-lambda';

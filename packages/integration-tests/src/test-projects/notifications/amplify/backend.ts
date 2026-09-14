import { defineBackend } from '@aws-amplify/backend';
import { defineNotifications } from '@aws-amplify/backend-notifications';
import { auth } from './auth/resource.js';

/**
 * Phase-0 create-from-scratch notifications backend.
 *
 * No `domainName` => defineNotifications provisions a brand-new Amazon Connect
 * instance AND Customer Profiles domain (plus the DynamoDB device store, SigV4
 * HTTP API and Lambdas). `instanceAlias` is namespaced with a per-run suffix
 * (injected by the test project creator, replacing the placeholder below) so
 * concurrent / repeated runs never collide on the globally-unique Connect alias.
 * APNS/FCM are intentionally omitted for the structural Phase-0 test.
 */
defineBackend({
  auth,
  notifications: defineNotifications({
    instanceAlias: '$INSTANCE_ALIAS',
  }),
});

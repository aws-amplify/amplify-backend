import { defineBackend } from '@aws-amplify/backend';
import { defineNotifications } from '@aws-amplify/backend-notifications';
import { auth } from './auth/resource.js';

/**
 * Attach-mode notifications backend.
 *
 * `domainName` is set => defineNotifications ATTACHES to an EXISTING Customer
 * Profiles domain: it registers the AmplifyProfile object type into that domain
 * and creates no Connect instance and no domain of its own. The placeholder
 * below is replaced by the test project creator with the name of a throwaway
 * domain it created for the run.
 */
defineBackend({
  auth,
  notifications: defineNotifications({
    domainName: '$DOMAIN_NAME',
  }),
});

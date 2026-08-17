import { defineBackend } from '@aws-amplify/backend';
import { dataAuth } from './test_factories.js';

const backend = defineBackend(dataAuth);
backend.auth.resources.cfnResources.cfnUserPool.addPropertyOverride(
  'AdminCreateUserConfig.AllowAdminCreateUserOnly',
  true,
);

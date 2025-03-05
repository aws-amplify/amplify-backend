import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { AccountPrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { RemovalPolicy } from 'aws-cdk-lib';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
});

const seedRoleStack = backend.createStack('seed-policy');

// need AmplifyBackendDeployFullAccess to be able to generate configs, would rather not add these permissions directly to the seed policy
const seedRole = new Role(seedRoleStack, 'SeedRole', {
  assumedBy: new AccountPrincipal(seedRoleStack.account),
  path: '/',
});
seedRole.applyRemovalPolicy(RemovalPolicy.DESTROY);

backend.addOutput({
  custom: {
    seedRoleArn: seedRole.roleArn,
    seedRoleName: seedRole.roleName,
  },
});

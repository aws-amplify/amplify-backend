import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { AccountPrincipal, ManagedPolicy, Role } from 'aws-cdk-lib/aws-iam';
import { RemovalPolicy } from 'aws-cdk-lib';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
});

const seedRoleStack = backend.createStack('seed-policy');

// this role has AdminAccess because the policies this role can assume are subset of the policies it initially has - it never directly uses AdminAccess
const seedRole = new Role(seedRoleStack, 'SeedRole', {
  assumedBy: new AccountPrincipal(seedRoleStack.account),
  path: '/',
  managedPolicies: [
    ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
  ],
});
seedRole.applyRemovalPolicy(RemovalPolicy.DESTROY);

backend.addOutput({
  custom: {
    seedRoleArn: seedRole.roleArn,
    seedRoleName: seedRole.roleName,
  },
});

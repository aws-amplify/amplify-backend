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

const seedRole = new Role(backend.stack, 'SeedRole', {
  assumedBy: new AccountPrincipal(backend.stack.account),
  path: '/',
});
seedRole.applyRemovalPolicy(RemovalPolicy.DESTROY);

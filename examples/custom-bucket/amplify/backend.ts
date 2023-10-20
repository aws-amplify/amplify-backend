import * as cdk from 'aws-cdk-lib/core';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Backend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

const backend = new Backend({
  auth,
  data,
});

const userPoolId = backend.resources.auth.resources.userPool.userPoolId;
const identityPoolId =
  backend.resources.auth.resources.cfnResources.identityPool.ref;

// create an "admins" group
const authGroupsStack = backend.getOrCreateStack('AuthGroupsStack');
const adminsGroupRole = new iam.Role(authGroupsStack, 'AdminsGroupRole', {
  roleName: 'DemoAdminRole',
  assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
    StringEquals: {
      'cognito-identity.amazonaws.com:aud': identityPoolId,
    },
    'ForAnyValue:StringLike': {
      'cognito-identity.amazonaws.com:amr': 'authenticated',
    },
  }),
});
const adminsGroup = new cognito.CfnUserPoolGroup(
  authGroupsStack,
  'AdminsGroup',
  {
    userPoolId,
    groupName: 'admins',
    precedence: 0,
    description: 'Admins group',
    roleArn: adminsGroupRole.roleArn,
  },
);

const storageStack = backend.getOrCreateStack('StorageStack');
const storage = new s3.Bucket(storageStack, 'Bucket', {
  bucketName: `mybucket-${Date.now()}`,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  encryption: s3.BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  versioned: true,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

const authRole = backend.resources.auth.resources.authenticatedUserIamRole!;
const unauthRole = backend.resources.auth.resources.unauthenticatedUserIamRole;

// now apply access to the storage resource
// https://docs.amplify.aws/lib/storage/configureaccess/q/platform/js/

// allow authenticated users to read and write to all public objects
storage.grantReadWrite(authRole, `public/*`);
// allow authenticated users to read and write to protected objects
storage.grantReadWrite(
  authRole,
  'protected/${cognito-identity.amazonaws.com:sub}/*',
);
// allow authenticated users to read and write to private objects
storage.grantReadWrite(
  authRole,
  'private/${cognito-identity.amazonaws.com:sub}/*',
);

// if guest access is enabled
if (unauthRole) {
  // allow guests to read all public objects
  storage.grantRead(unauthRole, `public/*`);
  // allow guests to read all protected objects
  storage.grantRead(unauthRole, `protected/*`);
  // but do not allow read to private objects
}

// allow admins access to everything in the bucket
storage.grantReadWrite(adminsGroupRole);
storage.grantDelete(adminsGroupRole);
storage.grantPut(adminsGroupRole);

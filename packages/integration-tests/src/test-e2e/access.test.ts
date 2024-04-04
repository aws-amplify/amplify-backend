import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { NpmRegistryController } from '../npm_registry_controller.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execa } from 'execa';
import { amplifyAtTag } from '../constants.js';
import { amplifyAppPool } from '../amplify_app_pool.js';
import { amplifyCli } from '../process-controller/process_controller.js';
import { ClientConfig, generateClientConfig } from '@aws-amplify/client-config';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import {
  CognitoIdentityClient,
  GetIdCommand,
  GetIdCommandOutput,
  GetIdentityPoolRolesCommand,
  GetIdentityPoolRolesCommandOutput,
  GetOpenIdTokenCommand,
  GetOpenIdTokenCommandOutput,
} from '@aws-sdk/client-cognito-identity';
import {
  AssumeRoleCommand,
  AssumeRoleWithWebIdentityCommand,
  STSClient,
} from '@aws-sdk/client-sts';
import { shortUuid } from '../short_uuid.js';
import assert from 'assert';
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { Amplify } from 'aws-amplify';
import * as Auth from 'aws-amplify/auth';
import crypto from 'node:crypto';

// https://github.com/aws-amplify/amplify-js/issues/12751
global.crypto = crypto;

const cognitoClient = new CognitoIdentityClient();
const cognitoIdentityProviderClient = new CognitoIdentityProviderClient();
const stsClient = new STSClient();

type TestProjectResources = {
  authRoleArn: string;
  unAuthRoleArn: string;
  clientConfig: ClientConfig;
};

const getTestProjectResources = async (
  stackName: string
): Promise<TestProjectResources> => {
  const clientConfig = await generateClientConfig(
    fromNodeProviderChain(),
    {
      stackName,
    },
    '1'
  );
  const cognitoRoles: GetIdentityPoolRolesCommandOutput =
    await cognitoClient.send(
      new GetIdentityPoolRolesCommand({
        IdentityPoolId: clientConfig.auth?.identity_pool_id,
      })
    );
  const authRoleArn = cognitoRoles.Roles['authenticated'];
  const unAuthRoleArn = cognitoRoles.Roles['unauthenticated'];
  return {
    authRoleArn,
    unAuthRoleArn,
    clientConfig,
  };
};

type CognitoUser = {
  username: string;
  password: string;
  idToken: any;
};

const getCognitoUser = async (
  testResources: TestProjectResources
): Promise<CognitoUser> => {
  const username = `${shortUuid()}@amazon.com`;
  const tempPassword = `Test1@${shortUuid()}`;
  const password = `Test1@${shortUuid()}`;
  await cognitoIdentityProviderClient.send(
    new AdminCreateUserCommand({
      UserPoolId: testResources.clientConfig.auth?.user_pool_id,
      TemporaryPassword: tempPassword,
      Username: username,
    })
  );
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: testResources.clientConfig.auth!.user_pool_id,
        userPoolClientId: testResources.clientConfig.auth!.user_pool_client_id,
        identityPoolId: testResources.clientConfig.auth!.identity_pool_id!,
        allowGuestAccess:
          testResources.clientConfig.auth!.unauthenticated_identities_enabled,
      },
    },
  });
  const signInResult = await Auth.signIn({
    username,
    password: tempPassword,
  });
  if (
    signInResult.nextStep.signInStep ===
    'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  ) {
    await Auth.confirmSignIn({
      challengeResponse: password,
    });
  }
  await Auth.signOut();
  await Auth.signIn({
    username,
    password,
  });
  const currentUser = await Auth.getCurrentUser();
  const authSession = await Auth.fetchAuthSession();

  const loginKey = authSession.tokens?.idToken?.payload.iss?.replace(
    'https://',
    ''
  );
  const logins: Record<string, string> = {};
  logins[loginKey] = authSession.tokens?.idToken?.toString();

  const getIdResponse: GetIdCommandOutput = await cognitoClient.send(
    new GetIdCommand({
      IdentityPoolId: testResources.clientConfig.auth?.identity_pool_id,
      Logins: logins,
    })
  );

  const getOpenIdTokenCommandResponse: GetOpenIdTokenCommandOutput =
    await cognitoClient.send(
      new GetOpenIdTokenCommand({
        IdentityId: getIdResponse.IdentityId,
        Logins: logins,
      })
    );

  return {
    username,
    password,
    idToken: authSession.tokens?.idToken,
  };
};



void describe('access tests', () => {
  const npmRegistryController = new NpmRegistryController(true);

  let projectDir1: string = '/Users/sobkamil/playground/access-checks/proj1';
  let projectDir2: string = '/Users/sobkamil/playground/access-checks/proj2';
  let testResources1: TestProjectResources;
  let testResources2: TestProjectResources;

  before(async () => {
    // await npmRegistryController.setUp();
    // projectDir1 = await fs.mkdtemp(
    //   path.join(os.tmpdir(), 'test-access-project1')
    // );
    // projectDir2 = await fs.mkdtemp(
    //   path.join(os.tmpdir(), 'test-access-project2')
    // );

    // await execa('npm', ['create', amplifyAtTag, '--yes', '--', '--debug'], {
    //   cwd: projectDir1,
    //   stdio: 'inherit',
    // });
    // await execa('npm', ['create', amplifyAtTag, '--yes', '--', '--debug'], {
    //   cwd: projectDir2,
    //   stdio: 'inherit',
    // });
    // const branch1 = await amplifyAppPool.createTestBranch();
    // const branch2 = await amplifyAppPool.createTestBranch();
    // await amplifyCli(
    //   [
    //     'pipeline-deploy',
    //     '--branch',
    //     branch1.branchName,
    //     '--appId',
    //     branch1.appId,
    //   ],
    //   projectDir1,
    //   {
    //     env: {
    //       CI: 'true',
    //     },
    //   }
    // ).run();
    // await amplifyCli(
    //   [
    //     'pipeline-deploy',
    //     '--branch',
    //     branch2.branchName,
    //     '--appId',
    //     branch2.appId,
    //   ],
    //   projectDir2,
    //   {
    //     env: {
    //       CI: 'true',
    //     },
    //   }
    // ).run();
    testResources1 = await getTestProjectResources(
      'amplify-d2y5ypvl03r8tt-testBranch9ea5927d9883-branch-ea8a291897'
    );
    testResources2 = await getTestProjectResources(
      'amplify-d2y5ypvl03r8tt-testBranchf13d683a7194-branch-1b7a533a90'
    );

    console.log(JSON.stringify(testResources1, null, 2));
    console.log(JSON.stringify(testResources2, null, 2));
  });
  after(async () => {
    // await fs.rm(projectDir1, { recursive: true });
    // await fs.rm(projectDir2, { recursive: true });
    // await npmRegistryController.tearDown();
  });

  void it('cannot assume cognito roles', async () => {
    for (let roleArn of [
      testResources1.authRoleArn,
      testResources1.unAuthRoleArn,
      testResources2.authRoleArn,
      testResources2.unAuthRoleArn,
    ]) {
      await assert.rejects(
        () =>
          stsClient.send(
            new AssumeRoleCommand({
              RoleArn: roleArn,
              RoleSessionName: shortUuid(),
            })
          ),
        (error: Error) => {
          assert.ok(
            error.message.includes(
              'is not authorized to perform: sts:AssumeRole on resource'
            )
          );
          return true;
        }
      );
    }
  });

  void it('can assume cognito role', async () => {
    const cognitoUser = await getCognitoUser(testResources1);
    await stsClient.send(
      new AssumeRoleWithWebIdentityCommand({
        RoleArn: testResources1.authRoleArn,
        RoleSessionName: shortUuid(),
        WebIdentityToken: cognitoUser.idToken.toString(),
      })
    );
  });
});

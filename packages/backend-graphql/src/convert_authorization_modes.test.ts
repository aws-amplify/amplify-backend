import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { Duration, Stack } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Role } from 'aws-cdk-lib/aws-iam';
import { AuthorizationModes as CDKAuthorizationModes } from '@aws-amplify/graphql-api-construct';
import { AuthorizationModes, FunctionInput } from './types.js';
import {
  ProvidedAuthResources,
  convertAuthorizationModesToCDK,
} from './convert_authorization_modes.js';
import { Function, IFunction } from 'aws-cdk-lib/aws-lambda';
import { FunctionInstanceProvider } from './convert_functions.js';

void describe('convertAuthorizationModesToCDK', () => {
  let stack: Stack;
  const functionInstanceProvider: FunctionInstanceProvider = {
    provide: (func: FunctionInput): IFunction => func as unknown as IFunction,
  };

  void beforeEach(() => {
    stack = new Stack();
  });

  void it('defaults to api key if nothing is provided', () => {
    const providedAuthResources: ProvidedAuthResources = {};

    const authModes: AuthorizationModes = {};

    const expectedOutput: CDKAuthorizationModes = {
      defaultAuthorizationMode: 'API_KEY',
      apiKeyConfig: {
        expires: Duration.days(7),
      },
    };

    assert.deepEqual(
      convertAuthorizationModesToCDK(
        stack,
        functionInstanceProvider,
        providedAuthResources,
        authModes
      ),
      expectedOutput
    );
  });

  void it('defaults to user pool auth if a user pool is present in provided auth resources', () => {
    const userPool = new UserPool(stack, 'TestPool');
    const identityPoolId = 'us-west-1:123456789';
    const authenticatedUserRole = Role.fromRoleName(
      stack,
      'AuthRole',
      'MyAuthRole'
    );
    const unauthenticatedUserRole = Role.fromRoleName(
      stack,
      'UnauthRole',
      'MyUnauthRole'
    );

    const providedAuthResources: ProvidedAuthResources = {
      userPool,
      identityPoolId,
      authenticatedUserRole,
      unauthenticatedUserRole,
    };

    const authModes: AuthorizationModes = {};

    const expectedOutput: CDKAuthorizationModes = {
      defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
      userPoolConfig: { userPool },
      iamConfig: {
        identityPoolId,
        authenticatedUserRole,
        unauthenticatedUserRole,
      },
    };

    assert.deepEqual(
      convertAuthorizationModesToCDK(
        stack,
        functionInstanceProvider,
        providedAuthResources,
        authModes
      ),
      expectedOutput
    );
  });

  void it('defaults to iam auth if a user pool is not present in provided auth resources', () => {
    const identityPoolId = 'us-west-1:123456789';
    const authenticatedUserRole = Role.fromRoleName(
      stack,
      'AuthRole',
      'MyAuthRole'
    );
    const unauthenticatedUserRole = Role.fromRoleName(
      stack,
      'UnauthRole',
      'MyUnauthRole'
    );

    const providedAuthResources: ProvidedAuthResources = {
      identityPoolId,
      authenticatedUserRole,
      unauthenticatedUserRole,
    };

    const authModes: AuthorizationModes = {};

    const expectedOutput: CDKAuthorizationModes = {
      defaultAuthorizationMode: 'AWS_IAM',
      iamConfig: {
        identityPoolId,
        authenticatedUserRole,
        unauthenticatedUserRole,
      },
    };

    assert.deepEqual(
      convertAuthorizationModesToCDK(
        stack,
        functionInstanceProvider,
        providedAuthResources,
        authModes
      ),
      expectedOutput
    );
  });

  void it('allows for overriding defaultAuthorizationMode and oidc config', () => {
    const providedAuthResources: ProvidedAuthResources = {};

    const authModes: AuthorizationModes = {
      defaultAuthorizationMode: 'OPENID_CONNECT',
      oidcConfig: {
        clientId: 'testClient',
        oidcProviderName: 'testProvider',
        oidcIssuerUrl: 'https://test.provider/',
        tokenExpireFromIssueInSeconds: 60,
        tokenExpiryFromAuthInSeconds: 90,
      },
    };

    const expectedOutput: CDKAuthorizationModes = {
      defaultAuthorizationMode: 'OPENID_CONNECT',
      oidcConfig: {
        clientId: 'testClient',
        oidcProviderName: 'testProvider',
        oidcIssuerUrl: 'https://test.provider/',
        tokenExpiryFromIssue: Duration.seconds(60),
        tokenExpiryFromAuth: Duration.seconds(90),
      },
      apiKeyConfig: {
        expires: Duration.days(7),
      },
    };

    assert.deepEqual(
      convertAuthorizationModesToCDK(
        stack,
        functionInstanceProvider,
        providedAuthResources,
        authModes
      ),
      expectedOutput
    );
  });

  void it('allows for overriding user pool config', () => {
    const providedUserPool = new UserPool(stack, 'ProvidedUserPool');
    const userDefinedUserPool = new UserPool(stack, 'UserDefinedUserPool');

    const providedAuthResources: ProvidedAuthResources = {
      userPool: providedUserPool,
    };

    const authModes: AuthorizationModes = {
      userPoolConfig: {
        userPool: userDefinedUserPool,
      },
    };

    const expectedOutput: CDKAuthorizationModes = {
      defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
      userPoolConfig: {
        userPool: userDefinedUserPool,
      },
    };

    assert.deepEqual(
      convertAuthorizationModesToCDK(
        stack,
        functionInstanceProvider,
        providedAuthResources,
        authModes
      ),
      expectedOutput
    );
  });

  void it('allows for overriding iam config', () => {
    const providedIdentityPoolId = 'providedIdentityPool';
    const providedAuthenticatedUserRole = Role.fromRoleName(
      stack,
      'ProvidedAuthRole',
      'ProvidedAuthRoleName'
    );
    const providedUnauthenticatedUserRole = Role.fromRoleName(
      stack,
      'ProvidedUnauthRole',
      'ProvidedUnauthRoleName'
    );
    const userDefinedIdentityPoolId = 'userDefinedIdentityPool';
    const userDefinedAuthenticatedUserRole = Role.fromRoleName(
      stack,
      'UserDefinedAuthRole',
      'UserDefinedAuthRoleName'
    );
    const userDefinedUnauthenticatedUserRole = Role.fromRoleName(
      stack,
      'UserDefinedUnauthRole',
      'UserDefinedUnauthRoleName'
    );

    const providedAuthResources: ProvidedAuthResources = {
      identityPoolId: providedIdentityPoolId,
      authenticatedUserRole: providedAuthenticatedUserRole,
      unauthenticatedUserRole: providedUnauthenticatedUserRole,
    };

    const authModes: AuthorizationModes = {
      iamConfig: {
        identityPoolId: userDefinedIdentityPoolId,
        authenticatedUserRole: userDefinedAuthenticatedUserRole,
        unauthenticatedUserRole: userDefinedUnauthenticatedUserRole,
      },
    };

    const expectedOutput: CDKAuthorizationModes = {
      defaultAuthorizationMode: 'AWS_IAM',
      iamConfig: {
        identityPoolId: userDefinedIdentityPoolId,
        authenticatedUserRole: userDefinedAuthenticatedUserRole,
        unauthenticatedUserRole: userDefinedUnauthenticatedUserRole,
      },
    };

    assert.deepEqual(
      convertAuthorizationModesToCDK(
        stack,
        functionInstanceProvider,
        providedAuthResources,
        authModes
      ),
      expectedOutput
    );
  });

  void it('allows for overriding api key config', () => {
    const providedAuthResources: ProvidedAuthResources = {};

    const authModes: AuthorizationModes = {
      apiKeyConfig: {
        description: 'MyApiKey',
        expiresInDays: 30,
      },
    };

    const expectedOutput: CDKAuthorizationModes = {
      defaultAuthorizationMode: 'API_KEY',
      apiKeyConfig: {
        description: 'MyApiKey',
        expires: Duration.days(30),
      },
    };

    assert.deepEqual(
      convertAuthorizationModesToCDK(
        stack,
        functionInstanceProvider,
        providedAuthResources,
        authModes
      ),
      expectedOutput
    );
  });

  void it('allows for overriding lambda config', () => {
    const authFunction = Function.fromFunctionName(
      stack,
      'ImportedFn',
      'MyImportedFn'
    );

    const providedAuthResources: ProvidedAuthResources = {};

    const authModes: AuthorizationModes = {
      defaultAuthorizationMode: 'AWS_LAMBDA',
      lambdaConfig: {
        function: authFunction,
        timeToLiveInSeconds: 30,
      },
    };

    const expectedOutput: CDKAuthorizationModes = {
      defaultAuthorizationMode: 'AWS_LAMBDA',
      lambdaConfig: {
        function: authFunction,
        ttl: Duration.seconds(30),
      },
      apiKeyConfig: {
        expires: Duration.days(7),
      },
    };

    assert.deepEqual(
      convertAuthorizationModesToCDK(
        stack,
        functionInstanceProvider,
        providedAuthResources,
        authModes
      ),
      expectedOutput
    );
  });

  void it('allows for specifying admin roles with an empty list', () => {
    const providedAuthResources: ProvidedAuthResources = {};

    const authModes: AuthorizationModes = {
      adminRoleNames: [],
    };

    const expectedOutput: CDKAuthorizationModes = {
      defaultAuthorizationMode: 'API_KEY',
      apiKeyConfig: {
        expires: Duration.days(7),
      },
      adminRoles: [],
    };

    assert.deepEqual(
      convertAuthorizationModesToCDK(
        stack,
        functionInstanceProvider,
        providedAuthResources,
        authModes
      ),
      expectedOutput
    );
  });

  void it('allows for specifying admin roles with values specified', () => {
    const convertedOutput = convertAuthorizationModesToCDK(
      stack,
      functionInstanceProvider,
      {},
      {
        adminRoleNames: ['Admin', 'QA'],
      }
    );

    assert.equal(convertedOutput.adminRoles?.length, 2);
    assert.equal(convertedOutput.adminRoles?.[0].roleName, 'Admin');
    assert.equal(convertedOutput.adminRoles?.[1].roleName, 'QA');
  });
});

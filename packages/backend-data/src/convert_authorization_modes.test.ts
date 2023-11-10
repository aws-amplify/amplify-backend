import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { Duration, Stack } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { IRole, Role } from 'aws-cdk-lib/aws-iam';
import { AuthorizationModes as CDKAuthorizationModes } from '@aws-amplify/graphql-api-construct';
import { AuthorizationModes } from './types.js';
import {
  ProvidedAuthConfig,
  buildConstructFactoryProvidedAuthConfig,
  convertAuthorizationModesToCDK,
  isUsingDefaultApiKeyAuth,
} from './convert_authorization_modes.js';
import { Code, Function, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { FunctionInstanceProvider } from './convert_functions.js';
import {
  AmplifyFunction,
  AuthResources,
  ConstructFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';

void describe('buildConstructFactoryProvidedAuthConfig', () => {
  void it('returns undefined if authResourceProvider is undefined', () => {
    assert.deepStrictEqual(
      buildConstructFactoryProvidedAuthConfig(undefined),
      undefined
    );
  });

  void it('returns providedAuthConfig if authResourceProvider is defined', () => {
    assert.deepStrictEqual(
      buildConstructFactoryProvidedAuthConfig({
        resources: {
          userPool: 'ThisIsAUserPool',
          authenticatedUserIamRole: 'ThisIsAnAuthenticatedUserIamRole',
          unauthenticatedUserIamRole: 'ThisIsAnUnauthenticatedUserIamRole',
          cfnResources: {
            cfnIdentityPool: {
              logicalId: 'IdentityPoolLogicalId',
            },
          },
        },
      } as unknown as ResourceProvider<AuthResources>),
      {
        userPool: 'ThisIsAUserPool',
        identityPoolId: 'IdentityPoolLogicalId',
        authenticatedUserRole: 'ThisIsAnAuthenticatedUserIamRole',
        unauthenticatedUserRole: 'ThisIsAnUnauthenticatedUserIamRole',
      }
    );
  });
});

void describe('convertAuthorizationModesToCDK', () => {
  let stack: Stack;
  let userPool: UserPool;
  const identityPoolId = 'us-west-1:123456789';
  let authenticatedUserRole: IRole;
  let unauthenticatedUserRole: IRole;
  let providedAuthConfig: ProvidedAuthConfig;
  let functionInstanceProvider: FunctionInstanceProvider;

  void beforeEach(() => {
    functionInstanceProvider = {
      provide: (func: ConstructFactory<AmplifyFunction>): IFunction =>
        func as unknown as IFunction,
    };
    stack = new Stack();
    userPool = new UserPool(stack, 'TestPool');
    authenticatedUserRole = Role.fromRoleName(stack, 'AuthRole', 'MyAuthRole');
    unauthenticatedUserRole = Role.fromRoleName(
      stack,
      'UnauthRole',
      'MyUnauthRole'
    );
    providedAuthConfig = {
      userPool,
      identityPoolId,
      authenticatedUserRole,
      unauthenticatedUserRole,
    };
  });

  void it('defaults to api key if nothing is provided', () => {
    const expectedOutput: CDKAuthorizationModes = {
      apiKeyConfig: {
        expires: Duration.days(7),
      },
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        functionInstanceProvider,
        undefined,
        undefined
      ),
      expectedOutput
    );
  });

  void it('defaults to user pool auth if a user pool is present in provided auth resources', () => {
    const expectedOutput: CDKAuthorizationModes = {
      defaultAuthorizationMode: 'AMAZON_COGNITO_USER_POOLS',
      userPoolConfig: { userPool },
      iamConfig: {
        identityPoolId,
        authenticatedUserRole,
        unauthenticatedUserRole,
        allowListedRoles: [],
      },
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        functionInstanceProvider,
        providedAuthConfig,
        undefined
      ),
      expectedOutput
    );
  });

  void it('allows for overriding defaultAuthorizationMode and oidc config', () => {
    const authModes: AuthorizationModes = {
      defaultAuthorizationMode: 'OPENID_CONNECT',
      oidcAuthorizationMode: {
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
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        functionInstanceProvider,
        undefined,
        authModes
      ),
      expectedOutput
    );
  });

  void it('allows for overriding api key config', () => {
    const authModes: AuthorizationModes = {
      apiKeyAuthorizationMode: {
        description: 'MyApiKey',
        expiresInDays: 30,
      },
    };

    const expectedOutput: CDKAuthorizationModes = {
      apiKeyConfig: {
        description: 'MyApiKey',
        expires: Duration.days(30),
      },
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        functionInstanceProvider,
        undefined,
        authModes
      ),
      expectedOutput
    );
  });

  void it('allows for overriding lambda config', () => {
    const authFn = new Function(stack, 'MyAuthFn', {
      runtime: Runtime.NODEJS_18_X,
      code: Code.fromInline(
        'module.handler = async () => console.log("Hello");'
      ),
      handler: 'index.handler',
    });
    const authFnFactory: ConstructFactory<AmplifyFunction> = {
      getInstance: () => ({
        resources: {
          lambda: authFn,
        },
      }),
    };
    functionInstanceProvider = {
      provide: (): IFunction => authFn,
    };

    const authModes: AuthorizationModes = {
      lambdaAuthorizationMode: {
        function: authFnFactory,
        timeToLiveInSeconds: 30,
      },
    };

    const expectedOutput: CDKAuthorizationModes = {
      lambdaConfig: {
        function: authFn,
        ttl: Duration.seconds(30),
      },
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        functionInstanceProvider,
        undefined,
        authModes
      ),
      expectedOutput
    );
  });

  void it('allows for specifying allow listed roles with an empty list', () => {
    const authModes: AuthorizationModes = {
      allowListedRoleNames: [],
    };

    const expectedOutput: CDKAuthorizationModes = {
      userPoolConfig: { userPool },
      iamConfig: {
        identityPoolId,
        authenticatedUserRole,
        unauthenticatedUserRole,
        allowListedRoles: [],
      },
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        functionInstanceProvider,
        providedAuthConfig,
        authModes
      ),
      expectedOutput
    );
  });

  void it('allows for specifying allow listed roles roles with values specified', () => {
    const authModes: AuthorizationModes = {
      allowListedRoleNames: ['MyAdminRole', 'MyQARole'],
    };

    const convertedOutput = convertAuthorizationModesToCDK(
      functionInstanceProvider,
      providedAuthConfig,
      authModes
    );

    assert.equal(convertedOutput.iamConfig?.allowListedRoles?.length, 2);
    assert.equal(
      convertedOutput.iamConfig?.allowListedRoles?.[0],
      'MyAdminRole'
    );
    assert.equal(convertedOutput.iamConfig?.allowListedRoles?.[1], 'MyQARole');
  });
});

void describe('isUsingDefaultApiKeyAuth', () => {
  void it('returns false when auth modes are specified', () => {
    assert.equal(
      isUsingDefaultApiKeyAuth(undefined, { apiKeyAuthorizationMode: {} }),
      false
    );
  });

  void it('returns false when provided auth resources are present', () => {
    assert.equal(
      isUsingDefaultApiKeyAuth({} as unknown as ProvidedAuthConfig, undefined),
      false
    );
  });

  void it('returns true when neither auth modes nor provided are resources are present', () => {
    assert.equal(isUsingDefaultApiKeyAuth(undefined, undefined), true);
  });
});

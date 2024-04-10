import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { Duration, Stack } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { IRole, Role } from 'aws-cdk-lib/aws-iam';
import { AuthorizationModes as CDKAuthorizationModes } from '@aws-amplify/data-construct';
import { AmplifyDataError, AuthorizationModes } from './types.js';
import {
  ProvidedAuthConfig,
  buildConstructFactoryProvidedAuthConfig,
  convertAuthorizationModesToCDK,
  isUsingDefaultApiKeyAuth,
} from './convert_authorization_modes.js';
import { CfnFunction, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import {
  AmplifyFunction,
  AuthResources,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { AmplifyUserError } from '@aws-amplify/platform-core';

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
              ref: 'us-fake-1:123123-123123',
            },
          },
        },
      } as unknown as ResourceProvider<AuthResources>),
      {
        userPool: 'ThisIsAUserPool',
        identityPoolId: 'us-fake-1:123123-123123',
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
  const getInstancePropsStub: ConstructFactoryGetInstanceProps =
    {} as unknown as ConstructFactoryGetInstanceProps;

  void beforeEach(() => {
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
      defaultAuthorizationMode: 'API_KEY',
      apiKeyConfig: {
        expires: Duration.days(7),
      },
      iamConfig: {
        enableIamAuthorizationMode: true,
      },
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        getInstancePropsStub,
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
      identityPoolConfig: {
        identityPoolId,
        authenticatedUserRole,
        unauthenticatedUserRole,
      },
      iamConfig: {
        enableIamAuthorizationMode: true,
      },
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        getInstancePropsStub,
        providedAuthConfig,
        undefined
      ),
      expectedOutput
    );
  });

  void it('allows for overriding defaultAuthorizationMode and oidc config', () => {
    const authModes: AuthorizationModes = {
      defaultAuthorizationMode: 'oidc',
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
      iamConfig: {
        enableIamAuthorizationMode: true,
      },
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        getInstancePropsStub,
        undefined,
        authModes
      ),
      expectedOutput
    );
  });

  void it('defaults to oidc if no other mode is provided', () => {
    const authModes: AuthorizationModes = {
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
      iamConfig: {
        enableIamAuthorizationMode: true,
      },
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        getInstancePropsStub,
        undefined,
        authModes
      ),
      expectedOutput
    );
  });

  void it('allows for overriding api key config', () => {
    const authModes: AuthorizationModes = {
      defaultAuthorizationMode: 'apiKey',
      apiKeyAuthorizationMode: {
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
      iamConfig: {
        enableIamAuthorizationMode: true,
      },
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        getInstancePropsStub,
        undefined,
        authModes
      ),
      expectedOutput
    );
  });

  void it('defaults to api key if no other mode is provided', () => {
    const authModes: AuthorizationModes = {
      apiKeyAuthorizationMode: {
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
      iamConfig: {
        enableIamAuthorizationMode: true,
      },
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        getInstancePropsStub,
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
          cfnResources: {
            cfnFunction: authFn.node.findChild('Resource') as CfnFunction,
          },
        },
      }),
    };

    const authModes: AuthorizationModes = {
      defaultAuthorizationMode: 'lambda',
      lambdaAuthorizationMode: {
        function: authFnFactory,
        timeToLiveInSeconds: 30,
      },
    };

    const expectedOutput: CDKAuthorizationModes = {
      defaultAuthorizationMode: 'AWS_LAMBDA',
      lambdaConfig: {
        function: authFn,
        ttl: Duration.seconds(30),
      },
      iamConfig: {
        enableIamAuthorizationMode: true,
      },
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        getInstancePropsStub,
        undefined,
        authModes
      ),
      expectedOutput
    );
  });

  void it('defaults to lambda if no other mode is provided', () => {
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
          cfnResources: {
            cfnFunction: authFn.node.findChild('Resource') as CfnFunction,
          },
        },
      }),
    };

    const authModes: AuthorizationModes = {
      lambdaAuthorizationMode: {
        function: authFnFactory,
        timeToLiveInSeconds: 30,
      },
    };

    const expectedOutput: CDKAuthorizationModes = {
      defaultAuthorizationMode: 'AWS_LAMBDA',
      lambdaConfig: {
        function: authFn,
        ttl: Duration.seconds(30),
      },
      iamConfig: {
        enableIamAuthorizationMode: true,
      },
    };

    assert.deepStrictEqual(
      convertAuthorizationModesToCDK(
        getInstancePropsStub,
        undefined,
        authModes
      ),
      expectedOutput
    );
  });

  void it('throws if not default if multiple modes are specified', () => {
    const authModes: AuthorizationModes = {
      apiKeyAuthorizationMode: {
        description: 'MyApiKey',
        expiresInDays: 30,
      },
      oidcAuthorizationMode: {
        clientId: 'testClient',
        oidcProviderName: 'testProvider',
        oidcIssuerUrl: 'https://test.provider/',
        tokenExpireFromIssueInSeconds: 60,
        tokenExpiryFromAuthInSeconds: 90,
      },
    };

    assert.throws(
      () =>
        convertAuthorizationModesToCDK(
          getInstancePropsStub,
          undefined,
          authModes
        ),
      (err: AmplifyUserError<AmplifyDataError>) => {
        assert.strictEqual(err.name, 'DefineDataConfigurationError');
        assert.strictEqual(
          err.message,
          'A defaultAuthorizationMode is required if multiple authorization modes are configured'
        );
        assert.strictEqual(
          err.resolution,
          "When calling 'defineData' specify 'authorizationModes.defaultAuthorizationMode'"
        );
        return true;
      }
    );
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

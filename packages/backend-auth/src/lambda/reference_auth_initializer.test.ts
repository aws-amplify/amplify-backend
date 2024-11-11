import { beforeEach, describe, it, mock } from 'node:test';
import { ReferenceAuthInitializer } from './reference_auth_initializer.js';
import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import assert from 'node:assert';
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
  DescribeUserPoolClientCommandOutput,
  DescribeUserPoolCommand,
  DescribeUserPoolCommandOutput,
  GetUserPoolMfaConfigCommand,
  GetUserPoolMfaConfigCommandOutput,
  ListGroupsCommand,
  ListGroupsCommandOutput,
  ListIdentityProvidersCommand,
  ListIdentityProvidersCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  CognitoIdentityClient,
  DescribeIdentityPoolCommand,
  DescribeIdentityPoolCommandOutput,
  GetIdentityPoolRolesCommand,
  GetIdentityPoolRolesCommandOutput,
} from '@aws-sdk/client-cognito-identity';
import {
  IdentityPool,
  IdentityPoolRoles,
  IdentityProviders,
  MFAResponse,
  SampleInputProperties,
  UserPool,
  UserPoolClient,
  UserPoolGroups,
} from '../test-resources/sample_data.js';

const customResourceEventCommon: Omit<
  CloudFormationCustomResourceEvent,
  'RequestType'
> = {
  ServiceToken: 'mockServiceToken',
  ResponseURL: 'mockPreSignedS3Url',
  StackId: 'mockStackId',
  RequestId: '123',
  LogicalResourceId: 'logicalId',
  ResourceType: 'AWS::CloudFormation::CustomResource',
  ResourceProperties: {
    ...SampleInputProperties,
    ServiceToken: 'token',
  },
};
const createCfnEvent: CloudFormationCustomResourceEvent = {
  RequestType: 'Create',
  ...customResourceEventCommon,
};

const updateCfnEvent: CloudFormationCustomResourceEvent = {
  RequestType: 'Update',
  PhysicalResourceId: 'physicalId',
  OldResourceProperties: {
    ...SampleInputProperties,
    ServiceToken: 'token',
  },
  ...customResourceEventCommon,
};

const deleteCfnEvent: CloudFormationCustomResourceEvent = {
  RequestType: 'Delete',
  PhysicalResourceId: 'physicalId',
  ...customResourceEventCommon,
};
const httpError = {
  $metadata: {
    httpStatusCode: 500,
  },
};
const httpSuccess = {
  $metadata: {
    httpStatusCode: 200,
  },
};
const groupName = 'ADMINS';
const groupRoleARN = 'arn:aws:iam::000000000000:role/sample-group-role';
const groupRoleARNNotOnUserPool =
  'arn:aws:iam::000000000000:role/sample-bad-group-role';
// aws sdk will throw with error message for any non 200 status so we don't need to re-package it
const awsSDKErrorMessageMock = new Error('this message comes from the aws sdk');
const uuidMock = () => '00000000-0000-0000-0000-000000000000';
const identityProviderClient = new CognitoIdentityProviderClient();
const identityClient = new CognitoIdentityClient();
const expectedData = {
  userPoolId: SampleInputProperties.userPoolId,
  webClientId: SampleInputProperties.userPoolClientId,
  identityPoolId: SampleInputProperties.identityPoolId,
  signupAttributes: '["sub","email"]',
  usernameAttributes: '["email"]',
  verificationMechanisms: '["email"]',
  passwordPolicyMinLength: '10',
  passwordPolicyRequirements:
    '["REQUIRES_NUMBERS","REQUIRES_LOWERCASE","REQUIRES_UPPERCASE"]',
  mfaConfiguration: 'ON',
  mfaTypes: '["TOTP"]',
  socialProviders: '["FACEBOOK","GOOGLE","LOGIN_WITH_AMAZON"]',
  oauthCognitoDomain: 'ref-auth-userpool-1.auth.us-east-1.amazoncognito.com',
  allowUnauthenticatedIdentities: 'true',
  oauthScope: '["email","openid","phone"]',
  oauthRedirectSignIn: 'https://redirect.com,https://redirect2.com',
  oauthRedirectSignOut: 'https://anotherlogouturl.com,https://logouturl.com',
  oauthResponseType: 'code',
  oauthClientId: SampleInputProperties.userPoolClientId,
};

void describe('ReferenceAuthInitializer', () => {
  let handler: ReferenceAuthInitializer;
  let describeUserPoolResponse: DescribeUserPoolCommandOutput;
  let getUserPoolMfaConfigResponse: GetUserPoolMfaConfigCommandOutput;
  let listIdentityProvidersResponse: ListIdentityProvidersCommandOutput;
  let describeUserPoolClientResponse: DescribeUserPoolClientCommandOutput;
  let describeIdentityPoolResponse: DescribeIdentityPoolCommandOutput;
  let getIdentityPoolRolesResponse: GetIdentityPoolRolesCommandOutput;
  let listGroupsResponse: ListGroupsCommandOutput;
  const rejectsAndMatchError = async (
    fn: Promise<unknown>,
    expectedErrorMessage: string
  ): Promise<void> => {
    await assert.rejects(fn, (error: Error) => {
      assert.strictEqual(error.message, expectedErrorMessage);
      return true;
    });
  };
  beforeEach(() => {
    handler = new ReferenceAuthInitializer(
      identityClient,
      identityProviderClient,
      uuidMock
    );
    describeUserPoolResponse = {
      ...httpSuccess,
      UserPool: UserPool,
    };
    getUserPoolMfaConfigResponse = {
      ...httpSuccess,
      ...MFAResponse,
    };
    listIdentityProvidersResponse = {
      ...httpSuccess,
      Providers: [...IdentityProviders],
    };
    describeUserPoolClientResponse = {
      ...httpSuccess,
      UserPoolClient: UserPoolClient,
    };
    describeIdentityPoolResponse = {
      ...httpSuccess,
      ...IdentityPool,
    };
    getIdentityPoolRolesResponse = {
      ...httpSuccess,
      ...IdentityPoolRoles,
    };
    listGroupsResponse = {
      ...httpSuccess,
      ...UserPoolGroups,
    };
    mock.method(
      identityProviderClient,
      'send',
      async (
        request:
          | DescribeUserPoolCommand
          | GetUserPoolMfaConfigCommand
          | ListIdentityProvidersCommand
          | DescribeUserPoolClientCommand
          | ListGroupsCommand
      ) => {
        if (request instanceof DescribeUserPoolCommand) {
          if (describeUserPoolResponse.$metadata.httpStatusCode !== 200) {
            throw awsSDKErrorMessageMock;
          }
          return describeUserPoolResponse;
        }
        if (request instanceof GetUserPoolMfaConfigCommand) {
          if (getUserPoolMfaConfigResponse.$metadata.httpStatusCode !== 200) {
            throw awsSDKErrorMessageMock;
          }
          return getUserPoolMfaConfigResponse;
        }
        if (request instanceof ListIdentityProvidersCommand) {
          if (listIdentityProvidersResponse.$metadata.httpStatusCode !== 200) {
            throw awsSDKErrorMessageMock;
          }
          return listIdentityProvidersResponse;
        }
        if (request instanceof DescribeUserPoolClientCommand) {
          if (describeUserPoolClientResponse.$metadata.httpStatusCode !== 200) {
            throw awsSDKErrorMessageMock;
          }
          return describeUserPoolClientResponse;
        }
        if (request instanceof ListGroupsCommand) {
          if (listGroupsResponse.$metadata.httpStatusCode !== 200) {
            throw awsSDKErrorMessageMock;
          }
          return listGroupsResponse;
        }
        return undefined;
      }
    );
    mock.method(
      identityClient,
      'send',
      async (
        request: DescribeIdentityPoolCommand | GetIdentityPoolRolesCommand
      ) => {
        if (request instanceof DescribeIdentityPoolCommand) {
          if (describeIdentityPoolResponse.$metadata.httpStatusCode !== 200) {
            throw awsSDKErrorMessageMock;
          }
          return describeIdentityPoolResponse;
        }
        if (request instanceof GetIdentityPoolRolesCommand) {
          if (getIdentityPoolRolesResponse.$metadata.httpStatusCode !== 200) {
            throw awsSDKErrorMessageMock;
          }
          return getIdentityPoolRolesResponse;
        }
        return undefined;
      }
    );
  });
  void it('handles create events', async () => {
    const result = await handler.handleEvent(createCfnEvent);
    assert.deepEqual(result.Status, 'SUCCESS');
    assert.equal(
      result.PhysicalResourceId,
      '00000000-0000-0000-0000-000000000000'
    );
    assert.deepEqual(result.Data, expectedData);
  });

  void it('handles update events', async () => {
    const result = await handler.handleEvent(updateCfnEvent);
    assert.deepEqual(result.Status, 'SUCCESS');
    assert.deepEqual(result.Data, expectedData);
  });

  void it('handles delete events', async () => {
    const result = await handler.handleEvent(deleteCfnEvent);
    assert.deepEqual(result.Status, 'SUCCESS');
  });

  void it('throws if fetching user pool fails', async () => {
    describeUserPoolResponse = httpError;
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      awsSDKErrorMessageMock.message
    );
  });

  void it('throws if fetching user pool fails', async () => {
    describeUserPoolResponse = {
      ...httpSuccess,
      UserPool: undefined,
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'Failed to retrieve the specified UserPool.'
    );
  });

  void it('throws if user pool has no password policy', async () => {
    describeUserPoolResponse = {
      ...httpSuccess,
      UserPool: {
        ...UserPool,
        Policies: undefined,
      },
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'Failed to retrieve password policy.'
    );
  });

  void it('throws if user pool uses alias attributes', async () => {
    describeUserPoolResponse = {
      ...httpSuccess,
      UserPool: {
        ...UserPool,
        UsernameAttributes: [],
        AliasAttributes: ['email', 'phone_number'],
      },
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'The specified user pool is configured with alias attributes which are not currently supported.'
    );
  });

  void it('throws if user pool does not have a domain configured and external login providers are enabled', async () => {
    describeUserPoolResponse = {
      ...httpSuccess,
      UserPool: {
        ...UserPool,
        Domain: undefined,
        CustomDomain: undefined,
      },
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'You must configure a domain for your UserPool if external login providers are enabled.'
    );
  });

  void it('throws if user pool group is not found', async () => {
    listGroupsResponse = {
      ...httpSuccess,
      Groups: [
        {
          GroupName: 'OTHERGROUP',
          RoleArn: groupRoleARNNotOnUserPool,
        },
      ],
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      `The group '${groupName}' with role '${groupRoleARN}' does not match any group for the specified user pool.`
    );
  });

  void it('throws if user pool groups request fails', async () => {
    listGroupsResponse = {
      ...httpError,
      Groups: undefined,
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      awsSDKErrorMessageMock.message
    );
  });

  void it('throws if user pool groups response is undefined', async () => {
    listGroupsResponse = {
      ...httpSuccess,
      Groups: undefined,
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'An error occurred while retrieving the groups for the user pool.'
    );
  });

  void it('throws if fetching user pool MFA config fails', async () => {
    getUserPoolMfaConfigResponse = httpError;
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      awsSDKErrorMessageMock.message
    );
  });

  void it('throws if fetching user pool providers fails', async () => {
    listIdentityProvidersResponse = {
      $metadata: {
        httpStatusCode: 500,
      },
      Providers: [],
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      awsSDKErrorMessageMock.message
    );
  });

  void it('throws if fetching user pool providers returns undefined', async () => {
    listIdentityProvidersResponse = {
      ...httpSuccess,
      Providers: undefined,
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'An error occurred while retrieving identity providers for the user pool.'
    );
  });

  void it('throws if fetching user pool client fails', async () => {
    describeUserPoolClientResponse = httpError;
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      awsSDKErrorMessageMock.message
    );
  });
  void it('throws if fetching user pool client returns undefined', async () => {
    describeUserPoolClientResponse = {
      ...httpSuccess,
      UserPoolClient: undefined,
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'An error occurred while retrieving the user pool client details.'
    );
  });
  void it('throws if user pool client does not have sign-out / logout URLs configured and external login providers are enabled', async () => {
    describeUserPoolClientResponse = {
      ...httpSuccess,
      UserPoolClient: {
        ...UserPoolClient,
        LogoutURLs: [],
      },
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'Your UserPool client must have "Allowed sign-out URLs" configured if external login providers are enabled.'
    );
  });
  void it('throws if user pool client does not have callback URLs configured and external login providers are enabled', async () => {
    describeUserPoolClientResponse = {
      ...httpSuccess,
      UserPoolClient: {
        ...UserPoolClient,
        CallbackURLs: [],
      },
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'Your UserPool client must have "Allowed callback URLs" configured if external login providers are enabled.'
    );
  });

  void it('throws if fetching identity pool fails', async () => {
    describeIdentityPoolResponse = {
      $metadata: {
        httpStatusCode: 500,
      },
      IdentityPoolId: undefined,
      IdentityPoolName: undefined,
      AllowUnauthenticatedIdentities: undefined,
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      awsSDKErrorMessageMock.message
    );
  });
  void it('throws if fetching identity pool returns undefined', async () => {
    describeIdentityPoolResponse = {
      ...httpSuccess,
      IdentityPoolId: undefined,
      IdentityPoolName: undefined,
      AllowUnauthenticatedIdentities: undefined,
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'An error occurred while retrieving the identity pool details.'
    );
  });

  void it('throws if fetching identity pool roles fails', async () => {
    getIdentityPoolRolesResponse = httpError;
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      awsSDKErrorMessageMock.message
    );
  });
  void it('throws if fetching identity pool roles return undefined', async () => {
    getIdentityPoolRolesResponse = {
      ...httpSuccess,
      Roles: undefined,
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'An error occurred while retrieving the roles for the identity pool.'
    );
  });
  // throws if userPool or client doesn't match identity pool
  void it('throws there is not matching userPool for the identity pool', async () => {
    describeIdentityPoolResponse = {
      ...describeIdentityPoolResponse,
      CognitoIdentityProviders: [
        {
          ProviderName:
            'cognito-idp.us-east-1.amazonaws.com/us-east-1_wrongUserPool',
          ClientId: 'sampleUserPoolClientId',
          ServerSideTokenCheck: false,
        },
      ],
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'The user pool and user pool client pair do not match any cognito identity providers for the specified identity pool.'
    );
  });
  void it('throws if identity pool does not have cognito identity providers configured', async () => {
    describeIdentityPoolResponse = {
      ...describeIdentityPoolResponse,
      CognitoIdentityProviders: [],
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'The specified identity pool does not have any cognito identity providers.'
    );
  });
  void it('throws if the client id does not match any cognito provider on the identity pool', async () => {
    describeIdentityPoolResponse = {
      ...describeIdentityPoolResponse,
      CognitoIdentityProviders: [
        {
          ProviderName:
            'cognito-idp.us-east-1.amazonaws.com/us-east-1_userpoolTest',
          ClientId: 'wrongClientId',
          ServerSideTokenCheck: false,
        },
      ],
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'The user pool and user pool client pair do not match any cognito identity providers for the specified identity pool.'
    );
  });
  void it('throws if auth role ARN does not match', async () => {
    getIdentityPoolRolesResponse = {
      ...httpSuccess,
      IdentityPoolId: SampleInputProperties.identityPoolId,
      Roles: {
        authenticated: 'wrongAuthRole',
        unauthenticated: SampleInputProperties.unauthRoleArn,
      },
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'The provided authRoleArn does not match the authenticated role for the specified identity pool.'
    );
  });
  void it('throws if unauth role ARN does not match', async () => {
    getIdentityPoolRolesResponse = {
      ...httpSuccess,
      IdentityPoolId: SampleInputProperties.identityPoolId,
      Roles: {
        authenticated: SampleInputProperties.authRoleArn,
        unauthenticated: 'wrongUnauthRole',
      },
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'The provided unauthRoleArn does not match the unauthenticated role for the specified identity pool.'
    );
  });
  void it('throws if user pool client is not a web client', async () => {
    describeUserPoolClientResponse = {
      ...httpSuccess,
      UserPoolClient: {
        ...UserPoolClient,
        ClientSecret: 'sample',
      },
    };
    await rejectsAndMatchError(
      handler.handleEvent(createCfnEvent),
      'The specified user pool client is not configured as a web client.'
    );
  });
});

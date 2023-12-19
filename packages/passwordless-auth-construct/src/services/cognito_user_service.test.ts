import {
  AdminCreateUserCommandInput,
  AdminDeleteUserAttributesCommandInput,
  AdminUpdateUserAttributesCommandInput,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { beforeEach, describe, it, mock } from 'node:test';
import { deepStrictEqual, rejects, strictEqual } from 'node:assert';
import { CognitoUserService } from './cognito_user_service.js';

/**
 * A mock client for issuing send command successful
 */
class MockCognitoClient extends CognitoIdentityProviderClient {
  send(_command: unknown, _options?: unknown, _cb?: unknown): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * A mock client for issuing failing send command
 */
class MockCognitoClientFail extends CognitoIdentityProviderClient {
  send(_command: unknown, _options?: unknown, _cb?: unknown): Promise<void> {
    return Promise.reject(new Error('error'));
  }
}

void describe('Cognito User Service - Create User', async () => {
  let mockCognitoClient: CognitoIdentityProviderClient;
  void describe('Happy Path', async () => {
    beforeEach(() => {
      mockCognitoClient = new MockCognitoClient();
    });

    void it('should return successful for user created with email', async () => {
      const sendMock = mock.method(mockCognitoClient, 'send');

      strictEqual(sendMock.mock.callCount(), 0);

      await new CognitoUserService(mockCognitoClient).createUser({
        username: 'username',
        userPoolId: 'userPoolId',
        email: 'username@amazon.com',
        region: 'us-west-2',
      });

      const expectedAttributes = {
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          {
            Name: 'email',
            Value: 'username@amazon.com',
          },
          {
            Name: 'custom:passwordless_sign_up',
            Value: '{"allowSignInAttempt":true,"deliveryMedium":"EMAIL"}',
          },
        ],
        UserPoolId: 'userPoolId',
        Username: 'username',
      };

      const actualCreateUserCommand = sendMock.mock.calls[0].arguments[0]
        .input as unknown as AdminCreateUserCommandInput;

      strictEqual(sendMock.mock.callCount(), 1);
      deepStrictEqual(actualCreateUserCommand, expectedAttributes);
    });

    void it('should return successful for user created with email', async () => {
      const sendMock = mock.method(mockCognitoClient, 'send');

      strictEqual(sendMock.mock.callCount(), 0);

      await new CognitoUserService(mockCognitoClient).createUser({
        username: 'username',
        userPoolId: 'userPoolId',
        phone_number: '+11111111111',
        region: 'us-west-2',
      });

      const expectedAttributes = {
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          {
            Name: 'phone_number',
            Value: '+11111111111',
          },
          {
            Name: 'custom:passwordless_sign_up',
            Value: '{"allowSignInAttempt":true,"deliveryMedium":"SMS"}',
          },
        ],
        UserPoolId: 'userPoolId',
        Username: 'username',
      };

      const actualCreateUserCommand = sendMock.mock.calls[0].arguments[0]
        .input as unknown as AdminCreateUserCommandInput;

      strictEqual(sendMock.mock.callCount(), 1);
      deepStrictEqual(actualCreateUserCommand, expectedAttributes);
    });
  });

  void describe('User already exists', async () => {
    beforeEach(() => {
      mockCognitoClient = new MockCognitoClientFail();
    });

    void it('should throw an error', async () => {
      const sendMock = mock.method(mockCognitoClient, 'send');

      strictEqual(sendMock.mock.callCount(), 0);

      await rejects(async () => {
        await new CognitoUserService(mockCognitoClient).createUser({
          username: 'username',
          userPoolId: 'userPoolId',
          phone_number: '+11111111111',
          region: 'us-west-2',
        });
      }, Error('User already exists'));
      strictEqual(sendMock.mock.callCount(), 1);
    });
  });
});

void describe('Cognito User service - Mark attribute as verified', async () => {
  let mockCognitoClient: CognitoIdentityProviderClient;
  beforeEach(() => {
    mockCognitoClient = new MockCognitoClient();
  });

  void it('should call cognito to verify phone number and delete custom attribute', async () => {
    const sendMock = mock.method(mockCognitoClient, 'send');

    strictEqual(sendMock.mock.callCount(), 0);

    await new CognitoUserService(
      mockCognitoClient
    ).markAsVerifiedAndDeletePasswordlessAttribute({
      username: 'username',
      attributeName: 'phone_number_verified',
      userPoolId: 'userPoolId',
      region: 'us-west-2',
    });

    const expectedUpdateUserAttributes = {
      UserAttributes: [
        {
          Name: 'phone_number_verified',
          Value: 'true',
        },
      ],
      UserPoolId: 'userPoolId',
      Username: 'username',
    };
    const expectedDeleteUserAttributes = {
      UserAttributeNames: ['custom:passwordless_sign_up'],
      UserPoolId: 'userPoolId',
      Username: 'username',
    };

    strictEqual(sendMock.mock.callCount(), 2);
    const actualUpdateUserCommandInput = sendMock.mock.calls[0].arguments[0]
      .input as unknown as AdminUpdateUserAttributesCommandInput;
    const actualDeleteAttributeCommandInput = sendMock.mock.calls[1]
      .arguments[0].input as unknown as AdminDeleteUserAttributesCommandInput;

    deepStrictEqual(actualUpdateUserCommandInput, expectedUpdateUserAttributes);
    deepStrictEqual(
      actualDeleteAttributeCommandInput,
      expectedDeleteUserAttributes
    );
  });

  void it('should call cognito to verify email and delete custom attribute', async () => {
    const sendMock = mock.method(mockCognitoClient, 'send');

    strictEqual(sendMock.mock.callCount(), 0);

    await new CognitoUserService(
      mockCognitoClient
    ).markAsVerifiedAndDeletePasswordlessAttribute({
      username: 'username',
      attributeName: 'email_verified',
      userPoolId: 'userPoolId',
      region: 'us-west-2',
    });

    const expectedUpdateUserAttributes = {
      UserAttributes: [
        {
          Name: 'email_verified',
          Value: 'true',
        },
      ],
      UserPoolId: 'userPoolId',
      Username: 'username',
    };
    const expectedDeleteUserAttributes = {
      UserAttributeNames: ['custom:passwordless_sign_up'],
      UserPoolId: 'userPoolId',
      Username: 'username',
    };

    strictEqual(sendMock.mock.callCount(), 2);
    const actualUpdateUserCommandInput = sendMock.mock.calls[0].arguments[0]
      .input as unknown as AdminUpdateUserAttributesCommandInput;
    const actualDeleteAttributeCommandInput = sendMock.mock.calls[1]
      .arguments[0].input as unknown as AdminDeleteUserAttributesCommandInput;

    deepStrictEqual(actualUpdateUserCommandInput, expectedUpdateUserAttributes);
    deepStrictEqual(
      actualDeleteAttributeCommandInput,
      expectedDeleteUserAttributes
    );
  });
});

import { beforeEach, describe, it, mock } from 'node:test';
import * as auth from 'aws-amplify/auth';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import assert from 'assert';
import { PersistentPasswordFlow } from './persistent_password_flow.js';
import { UserNotFoundException } from '@aws-sdk/client-cognito-identity-provider';

const testUsername = 'testUser1@test.com';
const testPassword = 'T3st_Password*';
const testTempPassword = 'Test1@Temp123';

void describe('persistent password flow test', () => {
  const mockAuthAPIs = {
    signIn: mock.fn<(input: auth.SignInInput) => Promise<auth.SignInOutput>>(
      async () =>
        Promise.resolve({
          isSignedIn: true,
          nextStep: {
            signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
          },
        } as auth.SignInOutput),
    ),
    confirmSignIn: mock.fn<
      (input: auth.ConfirmSignInInput) => Promise<auth.ConfirmSignInOutput>
    >(async () =>
      Promise.resolve({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as auth.SignInOutput),
    ),
  };
  const passwordFlow = new PersistentPasswordFlow(
    mockAuthAPIs as unknown as typeof auth,
  );

  void beforeEach(() => {
    mockAuthAPIs.confirmSignIn.mock.resetCalls();
    mockAuthAPIs.signIn.mock.resetCalls();
  });

  void it('confirms sign up of user with password flow', async () => {
    await passwordFlow.persistentPasswordSignUp(
      {
        username: testUsername,
        password: testPassword,
        signInAfterCreation: true,
        signInFlow: 'Password',
      },
      testTempPassword,
    );

    assert.strictEqual(mockAuthAPIs.confirmSignIn.mock.callCount(), 1);
    assert.strictEqual(mockAuthAPIs.signIn.mock.callCount(), 1);
  });

  void it('throws error if attempting to sign in user that does not exist with password flow', async () => {
    const expectedErr = new AmplifyUserError('UserExistsError', {
      message: `${testUsername} does not exist`,
      resolution: `Create a user called ${testUsername}`,
    });

    mockAuthAPIs.signIn.mock.mockImplementationOnce(() =>
      Promise.reject(
        new UserNotFoundException({
          $metadata: {},
          message: `${testUsername} does not exist`,
        }),
      ),
    );

    await assert.rejects(
      async () =>
        passwordFlow.persistentPasswordSignIn({
          username: testUsername,
          password: testPassword,
          signInFlow: 'Password',
        }),
      (err: AmplifyUserError) => {
        assert.strictEqual(err.name, expectedErr.name);
        assert.strictEqual(err.message, expectedErr.message);
        assert.strictEqual(err.resolution, expectedErr.resolution);
        return true;
      },
    );
  });
});

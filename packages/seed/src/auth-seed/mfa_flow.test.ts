import { beforeEach, describe, it, mock } from 'node:test';
import * as auth from 'aws-amplify/auth';
import { MfaFlow } from './mfa_flow.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import assert from 'assert';
import { UserNotFoundException } from '@aws-sdk/client-cognito-identity-provider';
import { AmplifyPrompter } from '@aws-amplify/cli-core';

const testUsername = 'testUser1@test.com';
const testPassword = 'T3st_Password*';
const testTempPassword = 'Test1@Temp123';
const challengeResponse = '012345';

void describe('mfa flow tests', () => {
  const mockAuthAPIs = {
    signIn: mock.fn<(input: auth.SignInInput) => Promise<auth.SignInOutput>>(
      async () =>
        Promise.resolve({
          isSignedIn: true,
          nextStep: {
            signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
          },
        } as auth.SignInOutput)
    ),
    confirmSignIn: mock.fn<
      (input: auth.ConfirmSignInInput) => Promise<auth.ConfirmSignInOutput>
    >(async () =>
      Promise.resolve({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as auth.SignInOutput)
    ),
    updateMFAPreference: mock.fn<
      (input: auth.UpdateMFAPreferenceInput) => Promise<void>
    >(async () => Promise.resolve()),
  };

  const mockPrompter = {
    input: mock.fn<(options: { message: string }) => Promise<string>>(
      async () => Promise.resolve(challengeResponse)
    ),
  };

  const mfaFlow = new MfaFlow(
    mockAuthAPIs as unknown as typeof auth,
    mockPrompter as unknown as typeof AmplifyPrompter
  );

  beforeEach(() => {
    mockAuthAPIs.confirmSignIn.mock.resetCalls();
    mockAuthAPIs.signIn.mock.resetCalls();
    mockPrompter.input.mock.resetCalls();
  });

  void describe('sign up user with mfa', () => {
    void it('signs up user with prompter if no challenge function provided', async () => {
      mockAuthAPIs.confirmSignIn.mock.mockImplementationOnce(
        (input: auth.ConfirmSignInInput) => {
          if (input.challengeResponse === '012345') {
            return Promise.resolve({
              isSignedIn: true,
              nextStep: {
                signInStep: 'DONE',
              },
            } as auth.ConfirmSignInOutput);
          }
          return Promise.resolve({
            isSignedIn: true,
            nextStep: {
              signInStep: 'CONFIRM_SIGN_IN_WITH_SMS_CODE',
            },
          } as auth.ConfirmSignInOutput);
        }
      );

      await mfaFlow.mfaSignUp(
        {
          username: testUsername,
          password: testPassword,
          signInAfterCreation: true,
          signInFlow: 'MFA',
        },
        testTempPassword
      );

      assert.strictEqual(mockPrompter.input.mock.callCount(), 1);
      assert.strictEqual(mockAuthAPIs.signIn.mock.callCount(), 1);
      assert.strictEqual(mockAuthAPIs.confirmSignIn.mock.callCount(), 2);
    });

    void it('signs up user with challenge function if it is provided', async () => {
      mockAuthAPIs.confirmSignIn.mock.mockImplementationOnce(
        (input: auth.ConfirmSignInInput) => {
          if (input.challengeResponse === '012345') {
            return Promise.resolve({
              isSignedIn: true,
              nextStep: {
                signInStep: 'DONE',
              },
            } as auth.ConfirmSignInOutput);
          }
          return Promise.resolve({
            isSignedIn: true,
            nextStep: {
              signInStep: 'CONFIRM_SIGN_IN_WITH_SMS_CODE',
            },
          } as auth.ConfirmSignInOutput);
        }
      );

      await mfaFlow.mfaSignUp(
        {
          username: testUsername,
          password: testPassword,
          signInAfterCreation: true,
          signInFlow: 'MFA',
          mfaPreference: 'SMS',
          signUpChallenge: async () =>
            Promise.resolve({ challengeResponse: challengeResponse }),
        },
        testTempPassword
      );

      assert.strictEqual(mockPrompter.input.mock.callCount(), 0);
      assert.strictEqual(mockAuthAPIs.signIn.mock.callCount(), 1);
      assert.strictEqual(mockAuthAPIs.confirmSignIn.mock.callCount(), 2);
    });

    void it('sign up user with TOTP', async () => {
      mockAuthAPIs.confirmSignIn.mock.mockImplementationOnce(
        (input: auth.ConfirmSignInInput) => {
          if (input.challengeResponse === '012345') {
            return Promise.resolve({
              isSignedIn: true,
              nextStep: {
                signInStep: 'DONE',
              },
            } as auth.ConfirmSignInOutput);
          }
          return Promise.resolve({
            isSignedIn: true,
            nextStep: {
              signInStep: 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP',
            },
          } as auth.ConfirmSignInOutput);
        }
      );

      await mfaFlow.mfaSignUp(
        {
          username: testUsername,
          password: testPassword,
          signInAfterCreation: true,
          signInFlow: 'MFA',
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          signUpChallenge: async (totpSetupDetails) =>
            Promise.resolve({ challengeResponse: challengeResponse }),
        },
        testTempPassword
      );

      assert.strictEqual(mockPrompter.input.mock.callCount(), 0);
      assert.strictEqual(mockAuthAPIs.signIn.mock.callCount(), 1);
      assert.strictEqual(mockAuthAPIs.confirmSignIn.mock.callCount(), 2);
    });

    void it('throws error if selected form of MFA is not available on userpool', async () => {
      mockAuthAPIs.confirmSignIn.mock.mockImplementationOnce(() =>
        Promise.resolve({
          isSignedIn: true,
          nextStep: {
            signInStep: 'CONTINUE_SIGN_IN_WITH_MFA_SELECTION',
            allowedMFATypes: ['EMAIL', 'TOTP'],
          },
        } as auth.ConfirmSignInOutput)
      );

      const mfaPreference = 'SMS';
      const expectedErr = new AmplifyUserError(
        'MFAPreferenceNotAvailableError',
        {
          message: `${mfaPreference} is not available for this userpool`,
          resolution: `Activate ${mfaPreference} for this userpool or sign in ${testUsername} with a different form of MFA`,
        }
      );

      await assert.rejects(
        async () =>
          await mfaFlow.mfaSignUp(
            {
              username: testUsername,
              password: testPassword,
              signInAfterCreation: true,
              signInFlow: 'MFA',
              mfaPreference: mfaPreference,
            },
            testTempPassword
          ),
        (err: AmplifyUserError) => {
          assert.strictEqual(err.name, expectedErr.name);
          assert.strictEqual(err.message, expectedErr.message);
          assert.strictEqual(err.resolution, expectedErr.resolution);
          return true;
        }
      );
    });

    void it('throws error if multiple forms of MFA are enabled but none are specified', async () => {
      mockAuthAPIs.confirmSignIn.mock.mockImplementationOnce(() =>
        Promise.resolve({
          isSignedIn: true,
          nextStep: {
            signInStep: 'CONTINUE_SIGN_IN_WITH_MFA_SELECTION',
            allowedMFATypes: ['EMAIL', 'TOTP'],
          },
        } as auth.ConfirmSignInOutput)
      );

      const expectedErr = new AmplifyUserError(
        'NoMFAPreferenceSpecifiedError',
        {
          message: `If multiple forms of MFA are enabled for a userpool, you must specify which form you intend to use for ${testUsername}`,
          resolution: `Specify a form of MFA for the user, ${testUsername}, to use with the mfaPreference property`,
        }
      );

      await assert.rejects(
        async () =>
          await mfaFlow.mfaSignUp(
            {
              username: testUsername,
              password: testPassword,
              signInAfterCreation: true,
              signInFlow: 'MFA',
            },
            testTempPassword
          ),
        (err: AmplifyUserError) => {
          assert.strictEqual(err.name, expectedErr.name);
          assert.strictEqual(err.message, expectedErr.message);
          assert.strictEqual(err.resolution, expectedErr.resolution);
          return true;
        }
      );
    });
  });

  void describe('sign in user with mfa', () => {
    void it('signs in user with prompter if no challenge function is provided', async () => {
      mockAuthAPIs.signIn.mock.mockImplementationOnce(async () =>
        Promise.resolve({
          isSignedIn: true,
          nextStep: {
            signInStep: 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE',
          },
        } as auth.SignInOutput)
      );

      await mfaFlow.mfaSignIn({
        username: testUsername,
        password: testPassword,
        signInFlow: 'MFA',
      });

      assert.strictEqual(mockPrompter.input.mock.callCount(), 1);
      assert.strictEqual(mockAuthAPIs.signIn.mock.callCount(), 1);
      assert.strictEqual(mockAuthAPIs.confirmSignIn.mock.callCount(), 1);
    });

    void it('signs in user with challenge function if it is provided', async () => {
      mockAuthAPIs.signIn.mock.mockImplementationOnce(async () =>
        Promise.resolve({
          isSignedIn: true,
          nextStep: {
            signInStep: 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE',
          },
        } as auth.SignInOutput)
      );

      await mfaFlow.mfaSignIn({
        signInChallenge: async () =>
          Promise.resolve({ challengeResponse: challengeResponse }),
        username: testUsername,
        password: testPassword,
        signInFlow: 'MFA',
      });

      assert.strictEqual(mockPrompter.input.mock.callCount(), 0);
      assert.strictEqual(mockAuthAPIs.signIn.mock.callCount(), 1);
      assert.strictEqual(mockAuthAPIs.confirmSignIn.mock.callCount(), 1);
    });

    void it('throws error if user created with persistent password attempts MFA sign in flow', async () => {
      const expectedErr = new AmplifyUserError('CannotSignInWithMFAError', {
        message: `${testUsername} cannot be signed in with MFA`,
        resolution: `Ensure that ${testUsername} exists and that MFA is set to REQUIRED.`,
      });

      await assert.rejects(
        async () =>
          mfaFlow.mfaSignIn({
            username: testUsername,
            password: testPassword,
            signInFlow: 'MFA',
          }),
        (err: AmplifyUserError) => {
          assert.strictEqual(err.name, expectedErr.name);
          assert.strictEqual(err.message, expectedErr.message);
          assert.strictEqual(err.resolution, expectedErr.resolution);
          return true;
        }
      );
    });

    void it('throws error if attempting to sign in a user that does not exist', async () => {
      const expectedErr = new AmplifyUserError('UserExistsError', {
        message: `${testUsername} does not exist`,
        resolution: `Create a user called ${testUsername}`,
      });

      mockAuthAPIs.signIn.mock.mockImplementationOnce(() =>
        Promise.reject(
          new UserNotFoundException({
            $metadata: {},
            message: `${testUsername} does not exist`,
          })
        )
      );

      await assert.rejects(
        async () =>
          mfaFlow.mfaSignIn({
            username: testUsername,
            password: testPassword,
            signInFlow: 'MFA',
          }),
        (err: AmplifyUserError) => {
          assert.strictEqual(err.name, expectedErr.name);
          assert.strictEqual(err.message, expectedErr.message);
          assert.strictEqual(err.resolution, expectedErr.resolution);
          return true;
        }
      );
    });
  });
});

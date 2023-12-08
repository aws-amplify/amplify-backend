import {
  AdminCreateUserCommand,
  AdminCreateUserCommandInput,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  RespondToAuthChallengeCommandInput,
  RespondToAuthChallengeCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { shortUuid } from '../short_uuid.js';

/**
 * Generate a username
 */
export const getUsername = (): string => {
  return String(`dummy_${shortUuid()}@email.com`);
};

/**
 * Create a verified user
 */
export const createVerifiedAuthUser = async (
  username: string,
  userPoolId: string,
  cognitoIdentityProvider: CognitoIdentityProviderClient
) => {
  const adminCreateInput: AdminCreateUserCommandInput = {
    Username: username,
    UserPoolId: userPoolId,
    UserAttributes: [
      { Name: 'email', Value: username },
      { Name: 'email_verified', Value: 'true' },
    ],
  };
  return await cognitoIdentityProvider.send(
    new AdminCreateUserCommand(adminCreateInput)
  );
};

/**
 * Create an unverified user
 */
export const createUnverifiedAuthUser = async (
  username: string,
  userPoolId: string,
  cognitoIdentityProvider: CognitoIdentityProviderClient
) => {
  const adminCreateInput: AdminCreateUserCommandInput = {
    Username: username,
    UserPoolId: userPoolId,
  };
  return await cognitoIdentityProvider.send(
    new AdminCreateUserCommand(adminCreateInput)
  );
};

/**
 * Start the magic link flow
 */
export const startMagicLinkFlow = async (
  username: string,
  userPoolClientId: string,
  cognitoIdentityProvider: CognitoIdentityProviderClient
): Promise<RespondToAuthChallengeCommandOutput> => {
  const initiateAuthCommand: InitiateAuthCommand = new InitiateAuthCommand({
    AuthFlow: 'CUSTOM_AUTH',
    ClientId: userPoolClientId,
    AuthParameters: {
      USERNAME: username,
    },
  });

  const { Session: session, ChallengeParameters: challengeParameters } =
    await cognitoIdentityProvider.send(initiateAuthCommand);

  const activeUsername = challengeParameters?.USERNAME ?? username;

  // Answer will not be used but it is required.
  const dummyAnswer = 'dummyAnswer';
  const dummyRedirect = 'https://example.com/magic-link/##code##';
  const respondToAuthChallengeCommandInput: RespondToAuthChallengeCommandInput =
    {
      ChallengeName: 'CUSTOM_CHALLENGE',
      ChallengeResponses: {
        USERNAME: activeUsername,
        ANSWER: dummyAnswer,
      },
      Session: session,
      ClientMetadata: {
        'Amplify.Passwordless.signInMethod': 'MAGIC_LINK',
        'Amplify.Passwordless.action': 'REQUEST',
        'Amplify.Passwordless.deliveryMedium': 'EMAIL',
        'Amplify.Passwordless.redirectUri': dummyRedirect,
      },
      ClientId: userPoolClientId,
    };
  const respondToAuthChallengeCommand = new RespondToAuthChallengeCommand(
    respondToAuthChallengeCommandInput
  );
  return cognitoIdentityProvider.send(respondToAuthChallengeCommand);
};

import assert from "assert";
import {
    AdminCreateUserCommand,
    CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { Amplify } from 'aws-amplify';
import * as auth from 'aws-amplify/auth';
import * as outputs from './amplify_outputs.json';
import crypto from 'node:crypto';
import * as secrets from './secrets.json';

globalThis.crypto = crypto;

const cognitoIdentityProviderClient = new CognitoIdentityProviderClient();

const username = secrets.default.username;
const temporaryPassword = `${secrets.default.password}Temp`;
const password = secrets.default.password;
await cognitoIdentityProviderClient.send(
    new AdminCreateUserCommand({
        Username: username,
        TemporaryPassword: temporaryPassword,
        UserPoolId: outputs.auth.user_pool_id,
        MessageAction: 'SUPPRESS',
    })
);

Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: outputs.auth.user_pool_id,
            userPoolClientId: outputs.auth.user_pool_client_id,
            identityPoolId: outputs.auth.identity_pool_id,
            allowGuestAccess: outputs.auth.unauthenticated_identities_enabled,
        },
    },
});

// in case there's already signed user in the session.
await auth.signOut();

const signInResult = await auth.signIn({
    username,
    password: temporaryPassword,
});

assert.strictEqual(
    signInResult.nextStep.signInStep,
    'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
);

await auth.confirmSignIn({
    challengeResponse: password,
});

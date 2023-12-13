import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import {
  createUnverifiedAuthUser,
  createVerifiedAuthUser,
  startMagicLinkFlow,
} from './passwordless_auth_resources.js';
import assert from 'node:assert';

type PasswordlessAuthTest = {
  readonly name: string;
  run: () => Promise<void>;
};

/**
 * Sign in with magic link test
 */
export class SignInWithMagicLink implements PasswordlessAuthTest {
  readonly name = 'sign in with magic link';
  /**
   * Sign in with magic link test constructor
   */
  constructor(
    private readonly cognitoIdentityProvider: CognitoIdentityProviderClient,
    private readonly userPoolId: string,
    private readonly userPoolClientId: string,
    private username: string
  ) {}

  /**
   * Run the test
   */
  async run(): Promise<void> {
    await this.signIn();
  }

  /**
   * Sign a verified user in using magic link
   */
  private async signIn() {
    const user = await createVerifiedAuthUser(
      this.username,
      this.userPoolId,
      this.cognitoIdentityProvider
    );
    const res = await startMagicLinkFlow(
      user.User?.Username ?? this.username,
      this.userPoolClientId,
      this.cognitoIdentityProvider
    );
    const nextStep = res.ChallengeParameters?.nextStep;
    assert.equal(nextStep, 'PROVIDE_CHALLENGE_RESPONSE');
  }
}
/**
 * Sign in with magic link with unverified attribute test
 */
export class SignInWithMagicLinkWithUnverifiedAttribute
  implements PasswordlessAuthTest
{
  readonly name = 'sign in with magic link with unverified attribute';

  /**
   * Sign in with magic link with unverified attribute test constructor
   */
  constructor(
    private readonly cognitoIdentityProvider: CognitoIdentityProviderClient,
    private readonly userPoolId: string,
    private readonly userPoolClientId: string,
    private username: string
  ) {}

  /**
   * Run the test
   */
  async run(): Promise<void> {
    await this.signInWithUnverifiedAttribute();
  }

  /**
   * Sign an unverified user in using magic link
   */
  private async signInWithUnverifiedAttribute() {
    const user = await createUnverifiedAuthUser(
      this.username,
      this.userPoolId,
      this.cognitoIdentityProvider
    );

    const res = await startMagicLinkFlow(
      user.User?.Username ?? this.username,
      this.userPoolClientId,
      this.cognitoIdentityProvider
    );
    const nextStep = res.ChallengeParameters?.nextStep;
    assert.notEqual(nextStep, 'PROVIDE_CHALLENGE_RESPONSE');
  }
}

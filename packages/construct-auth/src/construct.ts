import { Construct } from 'constructs';
import { aws_cognito as cognito, SecretValue } from 'aws-cdk-lib';
import { UserPool, UserPoolOperation } from 'aws-cdk-lib/aws-cognito';
import { EventHandlerSetter } from '@aws-amplify/core-types';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

export type GoogleLogin = {
  provider: 'google';
  webClientId: string;
  webClientSecret: string;
};

export type LoginMechanism = 'email' | 'username' | 'phone' | GoogleLogin;

/**
 * Auth props
 */
export type AuthProps = {
  loginMechanisms: LoginMechanism[];
};

/**
 * Amplify Auth CDK Construct
 */
export class Auth
  extends Construct
  implements EventHandlerSetter<UserPoolOperation>
{
  private readonly userPool: UserPool;
  /**
   * Create a new Auth construct with AuthProps
   */
  constructor(scope: Construct, id: string, props: AuthProps) {
    super(scope, id);

    this.verifyLoginMechanisms(props.loginMechanisms);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      signInCaseSensitive: true,
      signInAliases: {
        username: props.loginMechanisms.includes('username'),
        phone: props.loginMechanisms.includes('phone'),
        email: props.loginMechanisms.includes('email'),
      },
    });

    for (const loginMechanism of props.loginMechanisms) {
      if (typeof loginMechanism === 'object') {
        switch (loginMechanism.provider) {
          case 'google':
            new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleIdP', {
              userPool: this.userPool,
              clientSecretValue: SecretValue.unsafePlainText(
                loginMechanism.webClientSecret
              ),
              clientId: loginMechanism.webClientId,
            });
            break;
        }
      }
    }
  }

  /**
   * Configure the specified function to handle a Cognito UserPool event
   */
  setEventHandler(eventName: UserPoolOperation, handler: IFunction): void {
    this.userPool.addTrigger(eventName, handler);
  }

  /**
   * Username cannot be used in conjunction with phone or email
   */
  private verifyLoginMechanisms(loginMechanisms: LoginMechanism[]) {
    if (loginMechanisms.includes('username')) {
      if (
        loginMechanisms.includes('phone') ||
        loginMechanisms.includes('email')
      ) {
        throw new Error(
          'Username login mechanism cannot be used with phone or email login mechanisms'
        );
      }
    }
  }
}

import { Construct } from 'constructs';
import { aws_cognito as cognito, SecretValue } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import {
  FrontendConfigRegistry,
  FrontendConfigValuesProvider,
} from '@aws-amplify/plugin-types';

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
export class AmplifyAuth
  extends Construct
  implements FrontendConfigValuesProvider
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
   * Registers auth frontend config with the provided registry
   */
  provideFrontendConfigValues(registry: FrontendConfigRegistry) {
    registry.registerFrontendConfigData('@aws-amplify/auth-config', '^1.0.0', {
      userPoolId: this.userPool.userPoolId,
    });
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

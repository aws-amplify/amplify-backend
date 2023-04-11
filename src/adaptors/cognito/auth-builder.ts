import { AmplifyBuilderBase } from '../../input-definitions/amplify-builder-base';

type AuthConfig = {
  authorization: {
    allowGuestUsers: boolean;
  };
  authentication?: {
    passwordPolicy: {
      minLength?: number;
      requireLowercase?: boolean;
      requireNumbers?: boolean;
      requireSymbols?: boolean;
      requireUppercase?: boolean;
      tempPWValidityDays?: number;
    };
    signInMethod: ('username' | 'phone_number' | 'email')[];
    userGroups?: string[];
    identityProviders?: ('facebook' | 'sign_in_with_apple' | 'google' | 'login_with_amazon' | 'oidc')[];
  };
};

type Event =
  | 'createAuthChallenge'
  | 'defineAuthChallenge'
  | 'postAuthentication'
  | 'postConfirmation'
  | 'preAuthentication'
  | 'preSignUp'
  | 'preTokenGeneration'
  | 'verifyAuthChallengeResponse';

type RuntimeRoles = 'unauthenticatedUsers' | 'authenticatedUsers';

type Actions = 'create' | 'read' | 'update' | 'delete' | 'list';

export class AmplifyAuth extends AmplifyBuilderBase<AuthConfig, Event, RuntimeRoles, Actions> {
  constructor(config: AuthConfig) {
    super('@aws-amplify/auth–adaptor', config);
  }
}

export const Auth = (props: AuthConfig) => new AmplifyAuth(props);

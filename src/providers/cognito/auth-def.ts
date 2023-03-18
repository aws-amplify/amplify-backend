import { AmplifyBuilderBase, ResourceDefinition } from '../../manifest/amplify-builder-base';

type CognitoPropsBase = {
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

type Events =
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

type Props = ResourceDefinition<CognitoPropsBase, Events, RuntimeRoles>;

export class AmplifyAuth extends AmplifyBuilderBase<Props, Actions> {
  constructor(public readonly props: Props) {
    super('@aws-amplify/auth');
  }
}

export const Auth = (props: Props) => new AmplifyAuth(props);

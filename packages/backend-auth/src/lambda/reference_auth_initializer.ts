import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceSuccessResponse,
} from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
  DescribeUserPoolCommand,
  GetUserPoolMfaConfigCommand,
  GetUserPoolMfaConfigCommandOutput,
  GroupType,
  ListGroupsCommand,
  ListIdentityProvidersCommand,
  PasswordPolicyType,
  ProviderDescription,
  UserPoolClientType,
  UserPoolType,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  CognitoIdentityClient,
  DescribeIdentityPoolCommand,
  DescribeIdentityPoolCommandOutput,
  GetIdentityPoolRolesCommand,
} from '@aws-sdk/client-cognito-identity';
import { randomUUID } from 'node:crypto';
import { AuthOutput } from '@aws-amplify/backend-output-schemas';
export type ReferenceAuthInitializerProps = {
  userPoolId: string;
  identityPoolId: string;
  authRoleArn: string;
  unauthRoleArn: string;
  userPoolClientId: string;
  groups: Record<string, string>;
  region: string;
};

/**
 * Initializer that fetches and process auth resources.
 */
export class ReferenceAuthInitializer {
  /**
   * Create a new initializer
   * @param cognitoIdentityClient identity client
   * @param cognitoIdentityProviderClient identity provider client
   */
  constructor(
    private cognitoIdentityClient: CognitoIdentityClient,
    private cognitoIdentityProviderClient: CognitoIdentityProviderClient,
    private uuidGenerator: () => string
  ) {}

  /**
   * Handles custom resource events
   * @param event event to process
   * @returns custom resource response
   */
  public handleEvent = async (event: CloudFormationCustomResourceEvent) => {
    console.info(`Received '${event.RequestType}' event`);
    // physical id is only generated on create, otherwise it must stay the same
    const physicalId =
      event.RequestType === 'Create'
        ? this.uuidGenerator()
        : event.PhysicalResourceId;

    // on delete, just respond with success since we don't need to do anything
    if (event.RequestType === 'Delete') {
      return {
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        PhysicalResourceId: physicalId,
        StackId: event.StackId,
        NoEcho: true,
        Status: 'SUCCESS',
      } as CloudFormationCustomResourceSuccessResponse;
    }
    // for create or update events, we will fetch and validate resource properties
    const props =
      event.ResourceProperties as unknown as ReferenceAuthInitializerProps;
    const {
      userPool,
      userPoolPasswordPolicy,
      userPoolMFA,
      userPoolGroups,
      userPoolProviders,
      userPoolClient,
      identityPool,
      roles,
    } = await this.getResourceDetails(
      props.userPoolId,
      props.identityPoolId,
      props.userPoolClientId
    );

    this.validateResources(
      userPool,
      userPoolProviders,
      userPoolGroups,
      userPoolClient,
      identityPool,
      roles,
      props
    );

    const userPoolOutputs = await this.getUserPoolOutputs(
      userPool,
      userPoolPasswordPolicy,
      userPoolProviders,
      userPoolMFA,
      props.region
    );
    const identityPoolOutputs = await this.getIdentityPoolOutputs(identityPool);
    const userPoolClientOutputs = await this.getUserPoolClientOutputs(
      userPoolClient
    );
    const data: Omit<AuthOutput['payload'], 'authRegion'> = {
      userPoolId: props.userPoolId,
      webClientId: props.userPoolClientId,
      identityPoolId: props.identityPoolId,
      ...userPoolOutputs,
      ...identityPoolOutputs,
      ...userPoolClientOutputs,
    };
    return {
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      PhysicalResourceId: physicalId,
      StackId: event.StackId,
      NoEcho: true,
      Data: data,
      Status: 'SUCCESS',
    } as CloudFormationCustomResourceSuccessResponse;
  };

  private getUserPool = async (userPoolId: string) => {
    const userPoolCommand = new DescribeUserPoolCommand({
      UserPoolId: userPoolId,
    });
    const userPoolResponse = await this.cognitoIdentityProviderClient.send(
      userPoolCommand
    );
    if (!userPoolResponse.UserPool) {
      throw new Error('Failed to retrieve the specified UserPool.');
    }
    const userPool = userPoolResponse.UserPool;
    const policy = userPool.Policies?.PasswordPolicy;
    if (!policy) {
      throw new Error('Failed to retrieve password policy.');
    }
    return {
      userPool: userPoolResponse.UserPool,
      userPoolPasswordPolicy: policy,
    };
  };

  private getUserPoolMFASettings = async (userPoolId: string) => {
    // mfa types
    const mfaCommand = new GetUserPoolMfaConfigCommand({
      UserPoolId: userPoolId,
    });
    const mfaResponse = await this.cognitoIdentityProviderClient.send(
      mfaCommand
    );
    return mfaResponse;
  };

  private getUserPoolGroups = async (userPoolId: string) => {
    let nextToken: string | undefined;
    const groups: GroupType[] = [];
    do {
      const listGroupsResponse = await this.cognitoIdentityProviderClient.send(
        new ListGroupsCommand({
          UserPoolId: userPoolId,
          NextToken: nextToken,
        })
      );
      if (!listGroupsResponse.Groups) {
        throw new Error(
          'An error occurred while retrieving the groups for the user pool.'
        );
      }
      groups.push(...listGroupsResponse.Groups);
      nextToken = listGroupsResponse.NextToken;
    } while (nextToken);
    return groups;
  };

  private getUserPoolProviders = async (userPoolId: string) => {
    const providers: ProviderDescription[] = [];
    let nextToken: string | undefined;
    do {
      const providersResponse = await this.cognitoIdentityProviderClient.send(
        new ListIdentityProvidersCommand({
          UserPoolId: userPoolId,
          NextToken: nextToken,
        })
      );
      if (providersResponse.Providers === undefined) {
        throw new Error(
          'An error occurred while retrieving identity providers for the user pool.'
        );
      }
      providers.push(...providersResponse.Providers);
      nextToken = providersResponse.NextToken;
    } while (nextToken);
    return providers;
  };

  private getIdentityPool = async (identityPoolId: string) => {
    const idpResponse = await this.cognitoIdentityClient.send(
      new DescribeIdentityPoolCommand({
        IdentityPoolId: identityPoolId,
      })
    );
    if (!idpResponse.IdentityPoolId) {
      throw new Error(
        'An error occurred while retrieving the identity pool details.'
      );
    }
    return idpResponse;
  };

  private getIdentityPoolRoles = async (identityPoolId: string) => {
    const rolesCommand = new GetIdentityPoolRolesCommand({
      IdentityPoolId: identityPoolId,
    });
    const rolesResponse = await this.cognitoIdentityClient.send(rolesCommand);
    if (!rolesResponse.Roles) {
      throw new Error(
        'An error occurred while retrieving the roles for the identity pool.'
      );
    }
    return rolesResponse.Roles;
  };

  private getUserPoolClient = async (
    userPoolId: string,
    userPoolClientId: string
  ) => {
    const userPoolClientCommand = new DescribeUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientId: userPoolClientId,
    });
    const userPoolClientResponse =
      await this.cognitoIdentityProviderClient.send(userPoolClientCommand);
    if (!userPoolClientResponse.UserPoolClient) {
      throw new Error(
        'An error occurred while retrieving the user pool client details.'
      );
    }
    return userPoolClientResponse.UserPoolClient;
  };

  /**
   * Retrieves all of the resource data that is necessary for validation and output generation.
   * @param userPoolId userPoolId
   * @param identityPoolId identityPoolId
   * @param userPoolClientId userPoolClientId
   * @returns all necessary resource data
   */
  private getResourceDetails = async (
    userPoolId: string,
    identityPoolId: string,
    userPoolClientId: string
  ) => {
    const { userPool, userPoolPasswordPolicy } = await this.getUserPool(
      userPoolId
    );
    const userPoolMFA = await this.getUserPoolMFASettings(userPoolId);
    const userPoolProviders = await this.getUserPoolProviders(userPoolId);
    const userPoolGroups = await this.getUserPoolGroups(userPoolId);
    const userPoolClient = await this.getUserPoolClient(
      userPoolId,
      userPoolClientId
    );
    const identityPool = await this.getIdentityPool(identityPoolId);
    const roles = await this.getIdentityPoolRoles(identityPoolId);
    return {
      userPool,
      userPoolPasswordPolicy,
      userPoolMFA,
      userPoolProviders,
      userPoolGroups,
      userPoolClient,
      identityPool,
      roles,
    };
  };

  /**
   * Validate the resource associations.
   * 1. make sure the user pool & user pool client pair are a cognito provider for the identity pool
   * 2. make sure the provided auth/unauth role ARNs match the roles for the identity pool
   * 3. make sure the user pool client is a web client
   * @param userPool userPool
   * @param userPoolProviders the user pool providers
   * @param userPoolGroups the existing groups for the userPool
   * @param userPoolClient userPoolClient
   * @param identityPool identityPool
   * @param identityPoolRoles identityPool roles
   * @param props props that include the roles which we compare with the actual roles for the identity pool
   */
  private validateResources = (
    userPool: UserPoolType,
    userPoolProviders: ProviderDescription[],
    userPoolGroups: GroupType[],
    userPoolClient: UserPoolClientType,
    identityPool: DescribeIdentityPoolCommandOutput,
    identityPoolRoles: Record<string, string>,
    props: ReferenceAuthInitializerProps
  ) => {
    // verify the user pool is a cognito provider for this identity pool
    if (
      !identityPool.CognitoIdentityProviders ||
      identityPool.CognitoIdentityProviders.length === 0
    ) {
      throw new Error(
        'The specified identity pool does not have any cognito identity providers.'
      );
    }
    // check for alias attributes, since we don't support this yet
    if (userPool.AliasAttributes && userPool.AliasAttributes.length > 0) {
      throw new Error(
        'The specified user pool is configured with alias attributes which are not currently supported.'
      );
    }

    // check OAuth settings
    if (userPoolProviders.length > 0) {
      // validate user pool
      const domainSpecified = userPool.Domain || userPool.CustomDomain;
      if (!domainSpecified) {
        throw new Error(
          'You must configure a domain for your UserPool if external login providers are enabled.'
        );
      }

      // validate user pool client
      const hasLogoutUrls =
        userPoolClient.LogoutURLs && userPoolClient.LogoutURLs.length > 0;
      const hasCallbackUrls =
        userPoolClient.CallbackURLs && userPoolClient.CallbackURLs.length > 0;
      if (!hasLogoutUrls) {
        throw new Error(
          'Your UserPool client must have "Allowed sign-out URLs" configured if external login providers are enabled.'
        );
      }
      if (!hasCallbackUrls) {
        throw new Error(
          'Your UserPool client must have "Allowed callback URLs" configured if external login providers are enabled.'
        );
      }
    }

    // make sure props groups Roles actually exist for the user pool
    const groupEntries = Object.entries(props.groups);
    for (const [groupName, groupRoleARN] of groupEntries) {
      const match = userPoolGroups.find((g) => g.RoleArn === groupRoleARN);
      if (match === undefined) {
        throw new Error(
          `The group '${groupName}' with role '${groupRoleARN}' does not match any group for the specified user pool.`
        );
      }
    }
    // verify that the user pool + user pool client pair are configured with the identity pool
    const matchingProvider = identityPool.CognitoIdentityProviders.find((p) => {
      const matchingUserPool: boolean =
        p.ProviderName ===
        `cognito-idp.${props.region}.amazonaws.com/${userPool.Id}`;
      const matchingUserPoolClient: boolean =
        p.ClientId === userPoolClient.ClientId;
      return matchingUserPool && matchingUserPoolClient;
    });
    if (!matchingProvider) {
      throw new Error(
        'The user pool and user pool client pair do not match any cognito identity providers for the specified identity pool.'
      );
    }
    // verify the auth / unauth roles from the props match the identity pool roles that we retrieved
    const authRoleArn = identityPoolRoles['authenticated'];
    const unauthRoleArn = identityPoolRoles['unauthenticated'];
    if (authRoleArn !== props.authRoleArn) {
      throw new Error(
        'The provided authRoleArn does not match the authenticated role for the specified identity pool.'
      );
    }
    if (unauthRoleArn !== props.unauthRoleArn) {
      throw new Error(
        'The provided unauthRoleArn does not match the unauthenticated role for the specified identity pool.'
      );
    }

    // make sure the client is a web client here (web clients shouldn't have client secrets)
    if (userPoolClient?.ClientSecret) {
      throw new Error(
        'The specified user pool client is not configured as a web client.'
      );
    }
  };

  /**
   * Transform the userPool data into outputs.
   * @param userPool user pool
   * @param userPoolPasswordPolicy user pool password policy
   * @param userPoolProviders user pool providers
   * @param userPoolMFA user pool MFA settings
   * @returns formatted outputs
   */
  private getUserPoolOutputs = (
    userPool: UserPoolType,
    userPoolPasswordPolicy: PasswordPolicyType,
    userPoolProviders: ProviderDescription[],
    userPoolMFA: GetUserPoolMfaConfigCommandOutput,
    region: string
  ) => {
    // password policy requirements
    const requirements: string[] = [];
    userPoolPasswordPolicy.RequireNumbers &&
      requirements.push('REQUIRES_NUMBERS');
    userPoolPasswordPolicy.RequireLowercase &&
      requirements.push('REQUIRES_LOWERCASE');
    userPoolPasswordPolicy.RequireUppercase &&
      requirements.push('REQUIRES_UPPERCASE');
    userPoolPasswordPolicy.RequireSymbols &&
      requirements.push('REQUIRES_SYMBOLS');
    // mfa types
    const mfaTypes: string[] = [];
    if (
      userPoolMFA.SmsMfaConfiguration &&
      userPoolMFA.SmsMfaConfiguration.SmsConfiguration
    ) {
      mfaTypes.push('SMS_MFA');
    }
    if (userPoolMFA.SoftwareTokenMfaConfiguration?.Enabled) {
      mfaTypes.push('TOTP');
    }
    // social providers
    const socialProviders: string[] = [];
    if (userPoolProviders) {
      for (const provider of userPoolProviders) {
        const providerType = provider.ProviderType;
        const providerName = provider.ProviderName;
        if (providerType === 'Google') {
          socialProviders.push('GOOGLE');
        }
        if (providerType === 'Facebook') {
          socialProviders.push('FACEBOOK');
        }
        if (providerType === 'SignInWithApple') {
          socialProviders.push('SIGN_IN_WITH_APPLE');
        }
        if (providerType === 'LoginWithAmazon') {
          socialProviders.push('LOGIN_WITH_AMAZON');
        }
        if (providerType === 'OIDC' && providerName) {
          socialProviders.push(providerName);
        }
        if (providerType === 'SAML' && providerName) {
          socialProviders.push(providerName);
        }
      }
    }

    // domain
    const oauthDomain = userPool.CustomDomain ?? userPool.Domain ?? '';
    const fullDomainPath = `${oauthDomain}.auth.${region}.amazoncognito.com`;
    const data = {
      signupAttributes: JSON.stringify(
        userPool.SchemaAttributes?.filter(
          (attribute) => attribute.Required && attribute.Name
        ).map((attribute) => attribute.Name?.toLowerCase()) || []
      ),
      usernameAttributes: JSON.stringify(
        userPool.UsernameAttributes?.map((attribute) =>
          attribute.toLowerCase()
        ) || []
      ),
      verificationMechanisms: JSON.stringify(
        userPool.AutoVerifiedAttributes ?? []
      ),
      passwordPolicyMinLength:
        userPoolPasswordPolicy.MinimumLength === undefined
          ? ''
          : userPoolPasswordPolicy.MinimumLength.toString(),
      passwordPolicyRequirements: JSON.stringify(requirements),
      mfaConfiguration: userPool.MfaConfiguration ?? 'OFF',
      mfaTypes: JSON.stringify(mfaTypes),
      socialProviders: JSON.stringify(socialProviders),
      oauthCognitoDomain: fullDomainPath,
    };
    return data;
  };

  /**
   * Transforms identityPool info into outputs.
   * @param identityPool identity pool data
   * @returns formatted outputs
   */
  private getIdentityPoolOutputs = (
    identityPool: DescribeIdentityPoolCommandOutput
  ) => {
    const data = {
      allowUnauthenticatedIdentities:
        identityPool.AllowUnauthenticatedIdentities === true ? 'true' : 'false',
    };
    return data;
  };

  /**
   * Transforms userPoolClient info into outputs.
   * @param userPoolClient userPoolClient data
   * @returns formatted outputs
   */
  private getUserPoolClientOutputs = (userPoolClient: UserPoolClientType) => {
    const data = {
      oauthScope: JSON.stringify(userPoolClient.AllowedOAuthScopes ?? []),
      oauthRedirectSignIn: userPoolClient.CallbackURLs
        ? userPoolClient.CallbackURLs.join(',')
        : '',
      oauthRedirectSignOut: userPoolClient.LogoutURLs
        ? userPoolClient.LogoutURLs.join(',')
        : '',
      oauthResponseType: userPoolClient.AllowedOAuthFlows
        ? userPoolClient.AllowedOAuthFlows.join(',')
        : '',
      oauthClientId: userPoolClient.ClientId,
    };
    return data;
  };
}

/**
 * Entry point for the lambda-backend custom resource to retrieve auth outputs.
 */
export const handler = async (
  event: CloudFormationCustomResourceEvent
): Promise<CloudFormationCustomResourceResponse> => {
  const initializer = new ReferenceAuthInitializer(
    new CognitoIdentityClient(),
    new CognitoIdentityProviderClient(),
    randomUUID
  );
  return initializer.handleEvent(event);
};

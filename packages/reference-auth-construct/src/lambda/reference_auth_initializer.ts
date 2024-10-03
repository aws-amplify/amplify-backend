import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceFailedResponse,
  CloudFormationCustomResourceSuccessResponse,
} from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
  DescribeUserPoolCommand,
  GetUserPoolMfaConfigCommand,
  ListIdentityProvidersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  CognitoIdentityClient,
  DescribeIdentityPoolCommand,
} from '@aws-sdk/client-cognito-identity';
import { randomUUID } from 'node:crypto';
import { ReferenceAuthInitializerProps } from './reference_auth_initializer_types.js';
import { AuthOutput } from '@aws-amplify/backend-output-schemas';

/**
 * Entry point for the lambda-backend custom resource to retrieve a backend secret.
 */
export const handler = async (
  event: CloudFormationCustomResourceEvent
): Promise<
  | CloudFormationCustomResourceSuccessResponse
  | CloudFormationCustomResourceFailedResponse
> => {
  console.info(`Received '${event.RequestType}' event`);
  const physicalId =
    event.RequestType === 'Create' ? randomUUID() : event.PhysicalResourceId;

  let data;
  if (!(event.RequestType === 'Update' || event.RequestType === 'Create')) {
    data = await initialize(event);
  }

  return {
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    PhysicalResourceId: physicalId,
    Data: data,
    StackId: event.StackId,
    NoEcho: true,
    Status: 'SUCCESS',
  } as CloudFormationCustomResourceSuccessResponse;
};

/**
 * Fetches relevant information required for auth outputs.
 * @param event the CloudFormationCustomResourceEvent
 */
export const initialize = async (event: CloudFormationCustomResourceEvent) => {
  const props =
    event.ResourceProperties as unknown as ReferenceAuthInitializerProps;

  const userPoolOutputs = await getUserPoolOutputs(props.userPoolId);
  const identityPoolOutputs = await getIdentityPoolOutputs(
    props.identityPoolId
  );
  const userPoolClientOutputs = await getUserPoolClientOutputs(
    props.userPoolId,
    props.userPoolClientId
  );
  const data: Omit<AuthOutput['payload'], 'authRegion'> = {
    userPoolId: props.userPoolId,
    webClientId: props.userPoolClientId,
    identityPoolId: props.identityPoolId,
    ...userPoolOutputs,
    ...identityPoolOutputs,
    ...userPoolClientOutputs,
  };
  return data;
};

/**
 * Fetch UserPool information and transform it into outputs.
 * @param userPoolId the ID of the userPool
 * @returns formatted outputs
 */
export const getUserPoolOutputs = async (userPoolId: string) => {
  const userPoolClient = new CognitoIdentityProviderClient();
  const userPoolCommand = new DescribeUserPoolCommand({
    UserPoolId: userPoolId,
  });

  const userPoolResponse = await userPoolClient.send(userPoolCommand);
  const userPool = userPoolResponse.UserPool;
  if (!userPool) {
    return undefined;
  }
  const mfaCommand = new GetUserPoolMfaConfigCommand({
    UserPoolId: userPoolId,
  });
  const mfaResponse = await userPoolClient.send(mfaCommand);
  // TBD - what to do with userpool containing lots of providers? ie, pagination
  const providersCommand = new ListIdentityProvidersCommand({
    UserPoolId: userPoolId,
    MaxResults: 20,
  });
  const providersResponse = await userPoolClient.send(providersCommand);
  const policy = userPool.Policies?.PasswordPolicy;
  if (!policy) {
    return undefined;
  }
  // password policy requirements
  const requirements: string[] = [];
  policy.RequireNumbers && requirements.push('REQUIRES_NUMBERS');
  policy.RequireLowercase && requirements.push('REQUIRES_LOWERCASE');
  policy.RequireUppercase && requirements.push('REQUIRES_UPPERCASE');
  policy.RequireSymbols && requirements.push('REQUIRES_SYMBOLS');

  // mfa types
  const mfaTypes: string[] = [];
  if (
    mfaResponse.SmsMfaConfiguration &&
    mfaResponse.SmsMfaConfiguration.SmsConfiguration
  ) {
    mfaTypes.push('SMS_MFA');
  }
  if (mfaResponse.SoftwareTokenMfaConfiguration?.Enabled) {
    mfaTypes.push('TOTP');
  }

  // social providers
  const socialProviders: string[] = [];
  if (providersResponse.Providers) {
    for (const provider of providersResponse.Providers) {
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
      policy.MinimumLength === undefined ? '' : policy.MinimumLength.toString(),
    passwordPolicyRequirements: JSON.stringify(requirements),
    mfaConfiguration: userPool.MfaConfiguration ?? 'OFF',
    mfaTypes: JSON.stringify(mfaTypes),
    socialProviders: JSON.stringify(socialProviders),
    oauthCognitoDomain: oauthDomain,
  };
  return data;
};

/**
 * Fetch IdentityPool information and transform it into outputs.
 * @param identityPoolId the ID of the identityPool
 * @returns formatted outputs
 */
export const getIdentityPoolOutputs = async (identityPoolId: string) => {
  const identityPoolClient = new CognitoIdentityClient();

  const idpCommand = new DescribeIdentityPoolCommand({
    IdentityPoolId: identityPoolId,
  });

  const idpResponse = await identityPoolClient.send(idpCommand);
  const data = {
    allowUnauthenticatedIdentities:
      idpResponse.AllowUnauthenticatedIdentities === true ? 'true' : 'false',
  };
  return data;
};

/**
 * Fetch UserPoolClient information and transform it into outputs.
 * @param userPoolId the ID of the userPool
 * @param userPoolClientId the ID of the userPoolClient
 * @returns formatted outputs
 */
export const getUserPoolClientOutputs = async (
  userPoolId: string,
  userPoolClientId: string
) => {
  const identityProviderClient = new CognitoIdentityProviderClient();

  const userPoolClientCommand = new DescribeUserPoolClientCommand({
    UserPoolId: userPoolId,
    ClientId: userPoolClientId,
  });

  const userPoolClientResponse = await identityProviderClient.send(
    userPoolClientCommand
  );
  const userPoolClient = userPoolClientResponse.UserPoolClient;
  if (!userPoolClient) {
    return undefined;
  }
  const data = {
    oauthScope: JSON.stringify(userPoolClient.AllowedOAuthScopes ?? []),
    oauthRedirectSignIn: JSON.stringify(
      userPoolClient.CallbackURLs?.join(',') ?? []
    ),
    oauthRedirectSignOut: JSON.stringify(
      userPoolClient.LogoutURLs?.join(',') ?? []
    ),
    oauthResponseType: JSON.stringify(
      userPoolClient.AllowedOAuthFlows?.join(',') ?? []
    ),
    oauthClientId: userPoolClientId,
  };
  return data;
};

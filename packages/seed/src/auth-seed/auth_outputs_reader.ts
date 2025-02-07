import { generateClientConfig } from '@aws-amplify/client-config';
import { AmplifyUserError } from '@aws-amplify/platform-core';

export type AuthConfiguration = {
  userPoolId: string;
  mfaMethods?: ('SMS' | 'TOTP')[];
  mfaConfig?: 'NONE' | 'REQUIRED' | 'OPTIONAL';
  groups?: string[];
};

/**
 * Handles generating and reading from ClientConfig
 */
export class ConfigReader {
  getAuthConfig = async () => {
    if (!process.env.AMPLIFY_SANDBOX_IDENTIFIER) {
      throw new AmplifyUserError('SandboxIdentifierNotFoundError', {
        message: 'Sandbox Identifier is undefined',
        resolution: 'Run ampx sandbox before re-running ampx sandbox seed',
      });
    }

    const backendId = JSON.parse(process.env.AMPLIFY_SANDBOX_IDENTIFIER);

    const authConfig = (await generateClientConfig(backendId, '1.3')).auth;
    if (!authConfig) {
      throw new AmplifyUserError('MissingAuthError', {
        message:
          'Outputs for Auth are missing, you may be missing an Auth resource',
        resolution:
          'Create an Auth resource for your Amplify App or run ampx sandbox if you have generated your sandbox',
      });
    }
    const userGroups: string[] = [];

    for (const group in authConfig.groups) {
      userGroups.push(group);
    }

    const configuration: AuthConfiguration = {
      userPoolId: authConfig.user_pool_id,
      mfaConfig: authConfig.mfa_configuration,
      mfaMethods: authConfig.mfa_methods,
      groups: userGroups,
    };

    return configuration;
  };
}

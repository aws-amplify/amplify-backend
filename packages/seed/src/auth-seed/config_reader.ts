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
  /**
   * Constructor
   */
  constructor(
    private readonly generateClientConfiguration = generateClientConfig
  ) {}

  getAuthConfig = async () => {
    if (!process.env.AMPLIFY_BACKEND_IDENTIFIER) {
      throw new AmplifyUserError('SandboxIdentifierNotFoundError', {
        message: 'Sandbox Identifier is undefined',
        resolution:
          'Run ampx sandbox before re-running ampx sandbox seed. If you are running the seed script directly through tsx seed.ts, try running it with ampx sandbox seed instead',
      });
    }

    const backendId = JSON.parse(process.env.AMPLIFY_BACKEND_IDENTIFIER);

    const authConfig = (
      await this.generateClientConfiguration(backendId, '1.3')
    ).auth;
    if (!authConfig) {
      throw new AmplifyUserError('MissingAuthError', {
        message:
          'Outputs for Auth are missing, you may be missing an Auth resource',
        resolution:
          'Create an Auth resource for your Amplify App or run ampx sandbox if you have generated your sandbox',
      });
    }
    let userGroups: string[] | undefined = [];

    if (authConfig.groups) {
      for (const group of authConfig.groups.values()) {
        for (const k in group) {
          userGroups.push(k);
        }
      }
    } else {
      userGroups = undefined;
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

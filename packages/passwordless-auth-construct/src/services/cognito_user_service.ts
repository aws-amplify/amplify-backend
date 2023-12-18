// ../amplify-backend/packages/passwordless-auth-construct/lib/sign-up/createUserService.js

import {
  AdminCreateUserCommand,
  AdminDeleteUserAttributesCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { PASSWORDLESS_SIGN_UP_ATTR_NAME } from '../constants.js';
import {
  CreateUserParams,
  DeliveryMedium,
  MarkVerifiedAndDeletePasswordlessParams,
  UserService,
} from '../types.js';
import { logger } from '../logger.js';
/**
 * A service for interacting with Cognito User Poo
 */
export class CognitoUserService implements UserService {
  /**
   * Creates a new Cognito User constructor
   * @param client CognitoIdentityProviderClient Cognito client
   */
  constructor(private client: CognitoIdentityProviderClient) {}

  /**
   * Update user and mark attribute as verified
   * @param params - markAsVerifiedAndDeletePasswordlessAttribute parameters
   * @param params.username - Username
   * @param params.attributeName - User attribute to be verified
   * @param params.userPoolId - UserPool ID
   */
  async markAsVerifiedAndDeletePasswordlessAttribute(
    params: MarkVerifiedAndDeletePasswordlessParams
  ) {
    const { username, attributeName, userPoolId } = params;
    const attributeVerified = {
      Name: attributeName,
      Value: 'true',
    };

    const updateAttrCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: username,
      UserAttributes: [attributeVerified],
    });

    await this.client.send(updateAttrCommand);

    const deleteAttrCommand = new AdminDeleteUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: username,
      UserAttributeNames: [PASSWORDLESS_SIGN_UP_ATTR_NAME],
    });

    await this.client.send(deleteAttrCommand);
  }

  /**
   * Create User
   * @param params - Create User parameter
   * @param params.username - The username to be verify the attribute
   * @param params.email - The attribute that is going to used as email (optional)
   * @param params.phone_number - The attribute that is going to used as phone number (optional)
   * @param params.userPoolId - The UserPool ID
   */
  async createUser(params: CreateUserParams): Promise<void> {
    // this is the format for Cognito UserPool API, eslint not happy otherwise
    // eslint-disable-next-line
    const { userPoolId, username, email, phone_number } = params;

    // this is the format for Cognito UserPool API, eslint not happy otherwise
    // eslint-disable-next-line
    const userAttributes: Array<{ Name: string; Value: string }> = [];
    const passwordlessConfiguration: {
      allowSignInAttempt: boolean;
      deliveryMedium?: DeliveryMedium;
    } = {
      allowSignInAttempt: false,
      deliveryMedium: undefined,
    };

    if (email) {
      userAttributes.push({
        Name: 'email',
        Value: email,
      });
      passwordlessConfiguration.allowSignInAttempt = true;
      passwordlessConfiguration.deliveryMedium = 'EMAIL';
    }

    if (phone_number) {
      userAttributes.push({
        Name: 'phone_number',
        Value: phone_number,
      });

      passwordlessConfiguration.allowSignInAttempt = true;
      passwordlessConfiguration.deliveryMedium = 'SMS';
    }

    // TODO: what happens if both are included, which one should be valid?

    if (passwordlessConfiguration.allowSignInAttempt) {
      userAttributes.push({
        Name: PASSWORDLESS_SIGN_UP_ATTR_NAME,
        Value: JSON.stringify(passwordlessConfiguration),
      });
    }

    const command = new AdminCreateUserCommand({
      Username: username,
      UserPoolId: userPoolId,
      UserAttributes: userAttributes,
      MessageAction: 'SUPPRESS',
    });

    try {
      await this.client.send(command);
      return;
    } catch (err) {
      logger.debug(err);
      throw new Error('User already exists');
    }
  }
}

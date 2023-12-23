import {
  AdminCreateUserCommand,
  AdminDeleteUserAttributesCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  DeliveryMediumType,
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
   * @param cognitoClient - CognitoIdentity client (optional)
   */
  constructor(private cognitoClient: CognitoIdentityProviderClient) {}

  /**
   * Update user and mark attribute as verified
   * @param params - MarkAsVerifiedAndDeletePasswordlessAttribute parameters
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

    await this.cognitoClient.send(updateAttrCommand);

    const deleteAttrCommand = new AdminDeleteUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: username,
      UserAttributeNames: [PASSWORDLESS_SIGN_UP_ATTR_NAME],
    });

    await this.cognitoClient.send(deleteAttrCommand);
  }

  /**
   * Create User
   * @param params - Create User parameter
   * @param params.username - The username attribute
   * @param params.email - The attribute that is going to be used as an email (optional)
   * @param params.phoneNumber - The attribute that is going to used be as a phone number (optional)
   * @param params.userPoolId - The UserPool ID
   */
  async createUser(params: CreateUserParams): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { userPoolId, username, email, phoneNumber } = params;

    // this is the format for Cognito UserPool API, eslint not happy otherwise
    // eslint-disable-next-line  @typescript-eslint/naming-convention
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
      passwordlessConfiguration.deliveryMedium = DeliveryMediumType.EMAIL;
    }

    if (phoneNumber) {
      userAttributes.push({
        Name: 'phone_number',
        Value: phoneNumber,
      });

      passwordlessConfiguration.allowSignInAttempt = true;
      passwordlessConfiguration.deliveryMedium = DeliveryMediumType.SMS;
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
      await this.cognitoClient.send(command);
    } catch (err) {
      logger.debug(err);
      throw new Error('User already exists');
    }
  }
}

import { CreateAuthChallengeTriggerEvent } from 'aws-lambda';
import { CodeDeliveryDetails, DeliveryMedium } from '../types.js';

/**
 * Parses and validates the CodeDeliveryDetails out of the CreateAuthChallengeTriggerEvent.
 * Verifies that the user, delivery medium, and destination are valid.
 * @param event - The Create Auth Challenge event provided by Cognito.
 * @returns CodeDeliveryDetails if valid else throws error
 */
export const validateDeliveryCodeDetails = (
  event: CreateAuthChallengeTriggerEvent
): CodeDeliveryDetails => {
  const { deliveryMedium } = event.request.clientMetadata as Record<
    string,
    string | undefined
  >;

  if (deliveryMedium !== 'SMS' && deliveryMedium !== 'EMAIL') {
    throw Error('Invalid delivery medium. Only SMS and email are supported.');
  }

  const attributeName = deliveryMedium === 'SMS' ? 'phone_number' : 'email';

  return {
    attributeName,
    deliveryMedium,
  };
};

/**
 * Validates and returns the destination for the code or link.
 * @param deliveryMedium - The delivery medium for the challenge.
 * @param event - The Create Auth Challenge event.
 * @returns the email address or phone number to send the code or link to.
 */
export const validateDestination = (
  deliveryMedium: DeliveryMedium,
  event: CreateAuthChallengeTriggerEvent
): string => {
  const {
    email,
    phone_number: phoneNumber,
    email_verified: emailVerified,
    phone_number_verified: phoneNumberVerified,
  } = event.request.userAttributes;
  if (
    deliveryMedium === 'SMS' &&
    (!phoneNumber || phoneNumberVerified !== 'true')
  ) {
    throw Error(
      'A code or link was requested to be sent via SMS but the user does not have a verified phone number.'
    );
  }

  if (deliveryMedium === 'EMAIL' && (!email || emailVerified !== 'true')) {
    throw Error(
      'A code or link was requested to be sent via email but the user does not have a verified email address.'
    );
  }

  return deliveryMedium === 'SMS' ? phoneNumber : email;
};

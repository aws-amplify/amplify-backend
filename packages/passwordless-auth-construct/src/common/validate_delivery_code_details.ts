import { CreateAuthChallengeTriggerEvent } from 'aws-lambda';
import { CodeDeliveryDetails } from '../types.js';

/**
 * Parses and validates the CodeDeliveryDetails out of the CreateAuthChallengeTriggerEvent.
 * Verifies that the user, delivery medium, and destination are valid.
 * @param event - The Create Auth Challenge event provided by Cognito.
 * @returns CodeDeliveryDetails if valid else throws error
 */
export const validateDeliveryCodeDetails = (
  event: CreateAuthChallengeTriggerEvent
): CodeDeliveryDetails => {
  const {
    email,
    phone_number: phoneNumber,
    email_verified: emailVerified,
    phone_number_verified: phoneNumberVerified,
  } = event.request.userAttributes;
  const { deliveryMedium } = event.request.clientMetadata as Record<
    string,
    string | undefined
  >;

  // TODO: Handle error responses & prevent user existence message
  // ie, send generic message that does not reveal user existence
  if (event.request.userNotFound) {
    throw Error('User not found');
  }

  if (deliveryMedium !== 'SMS' && deliveryMedium !== 'EMAIL') {
    throw Error('Invalid destination medium');
  }

  if (deliveryMedium === 'SMS' && !phoneNumber) {
    throw Error('Phone number not found');
  }

  if (deliveryMedium === 'SMS' && phoneNumberVerified !== 'true') {
    throw Error('Phone number is not verified');
  }

  if (deliveryMedium === 'EMAIL' && !email) {
    throw Error('Email not found');
  }

  if (deliveryMedium === 'EMAIL' && emailVerified !== 'true') {
    throw Error('Email is not verified');
  }

  return {
    attributeName: deliveryMedium === 'SMS' ? 'phone_number' : 'email',
    deliveryMedium: deliveryMedium,
    destination: deliveryMedium === 'SMS' ? phoneNumber : email,
  };
};

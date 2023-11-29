import { CreateAuthChallengeTriggerEvent } from 'aws-lambda';
import { equal, rejects } from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildCreateAuthChallengeEvent,
  requestOtpEmailMetaData,
  requestOtpSmsMetaData,
} from '../mocks/challenge_events.mock.js';
import { validateDeliveryCodeDetails } from './validate_delivery_code_details.js';

void describe('validateDeliveryCodeDetails()', () => {
  void it('should succeed if valid data is provided for SMS', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], requestOtpSmsMetaData, {
        phone_number: '+15558887890',
        phone_number_verified: 'true',
      });
    const details = validateDeliveryCodeDetails(event);
    equal(details.attributeName, 'phone_number');
    equal(details.deliveryMedium, 'SMS');
    equal(details.destination, '+15558887890');
  });

  void it('should succeed if valid data is provided for email', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], requestOtpEmailMetaData, {
        email: 'foo@example.com',
        email_verified: 'true',
      });
    const details = validateDeliveryCodeDetails(event);
    equal(details.attributeName, 'email');
    equal(details.deliveryMedium, 'EMAIL');
    equal(details.destination, 'foo@example.com');
  });

  void it('should throw error if User is not found', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], requestOtpSmsMetaData);

    event.request.userNotFound = true;

    await rejects(
      async () => validateDeliveryCodeDetails(event),
      Error('User not found')
    );
  });

  void it('should throw an error if deliveryMedium is not SMS or EMAIL', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], {
        ...requestOtpSmsMetaData,
        deliveryMedium: 'PHONE',
      });

    await rejects(
      async () => validateDeliveryCodeDetails(event),
      Error('Invalid destination medium')
    );
  });

  void it('should throw an error if phone number is not found', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], requestOtpSmsMetaData, {});

    await rejects(
      async () => validateDeliveryCodeDetails(event),
      Error('Phone number not found')
    );
  });

  void it('should throw an error if phone number is not verified', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], requestOtpSmsMetaData, {
        phone_number: '+15555555555',
        phone_number_verified: 'false',
      });

    await rejects(
      async () => validateDeliveryCodeDetails(event),
      Error('Phone number is not verified')
    );
  });

  void it('should throw an error if email is not found', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], requestOtpEmailMetaData, {});

    await rejects(
      async () => validateDeliveryCodeDetails(event),
      Error('Email not found')
    );
  });

  void it('should throw an error if email is not verified', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], requestOtpEmailMetaData, {
        email: 'test@example.com',
        email_verified: 'false',
      });

    await rejects(
      async () => validateDeliveryCodeDetails(event),
      Error('Email is not verified')
    );
  });
});

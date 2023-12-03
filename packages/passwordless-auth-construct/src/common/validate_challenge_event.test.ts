import { CreateAuthChallengeTriggerEvent } from 'aws-lambda';
import { equal, rejects } from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildCreateAuthChallengeEvent,
  requestOtpEmailMetaData,
  requestOtpSmsMetaData,
} from '../mocks/challenge_events.mock.js';
import {
  validateDeliveryCodeDetails,
  validateDestination,
} from './validate_challenge_event.js';

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
  });

  void it('should throw an error if deliveryMedium is not SMS or EMAIL', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], {
        ...requestOtpSmsMetaData,
        deliveryMedium: 'PHONE',
      });

    await rejects(
      async () => validateDeliveryCodeDetails(event),
      Error('Invalid delivery medium. Only SMS and email are supported.')
    );
  });
});

void describe('validateDestination', () => {
  void it('should succeed if valid data is provided for SMS', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], requestOtpSmsMetaData, {
        phone_number: '+15558887890',
        phone_number_verified: 'true',
      });
    const destination = validateDestination('SMS', event);
    equal(destination, '+15558887890');
  });

  void it('should succeed if valid data is provided for Email', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], requestOtpSmsMetaData, {
        email: 'foo@example.com',
        email_verified: 'true',
      });
    const destination = validateDestination('EMAIL', event);
    equal(destination, 'foo@example.com');
  });

  void it('should throw an error if phone number is not found', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], requestOtpSmsMetaData, {});

    await rejects(
      async () => validateDestination('SMS', event),
      Error(
        'A code or link was requested to be sent via SMS but the user does not have a verified phone number.'
      )
    );
  });

  void it('should throw an error if phone number is not verified', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], requestOtpSmsMetaData, {
        phone_number: '+15555555555',
        phone_number_verified: 'false',
      });

    await rejects(
      async () => validateDestination('SMS', event),
      Error(
        'A code or link was requested to be sent via SMS but the user does not have a verified phone number.'
      )
    );
  });

  void it('should throw an error if email is not found', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], requestOtpEmailMetaData, {});

    await rejects(
      async () => validateDestination('EMAIL', event),
      Error(
        'A code or link was requested to be sent via email but the user does not have a verified email address.'
      )
    );
  });

  void it('should throw an error if email is not verified', async () => {
    const event: CreateAuthChallengeTriggerEvent =
      buildCreateAuthChallengeEvent([], requestOtpEmailMetaData, {
        email: 'test@example.com',
        email_verified: 'false',
      });

    await rejects(
      async () => validateDestination('EMAIL', event),
      Error(
        'A code or link was requested to be sent via email but the user does not have a verified email address.'
      )
    );
  });
});

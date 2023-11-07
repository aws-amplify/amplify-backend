import {
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from 'aws-lambda';
import { notStrictEqual, rejects, strictEqual } from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { DeliveryServiceFactory } from '../factories/delivery_service_factory.js';

import {
  buildCreateAuthChallengeEvent,
  buildVerifyAuthChallengeResponseEvent,
  confirmOtpMetaData,
  emailUserAttributes,
  phoneUserAttributes,
  requestOtpEmailMetaData,
  requestOtpSmsMetaData,
} from '../mocks/challenge_events.mock.js';
import { DeliveryMedium, DeliveryService, OtpConfig } from '../types.js';
import { OtpChallengeService } from './otp_challenge_service.js';

/**
 * A mock SnsService
 */
class MockDeliveryService implements DeliveryService {
  constructor(public deliveryMedium: DeliveryMedium) {}
  send = async (): Promise<void> => Promise.resolve();
  mask = (): string => '';
  createMessage = (): string => '';
}

void describe('OTP Challenge', () => {
  const mockOtpCode = '123456';
  let otpChallenge: OtpChallengeService;
  let mockSmsService: MockDeliveryService;
  let mockEmailService: MockDeliveryService;

  void beforeEach(() => {
    mockSmsService = new MockDeliveryService('SMS');
    mockEmailService = new MockDeliveryService('EMAIL');

    const otpConfig: OtpConfig = {
      otpLength: 6,
    };

    const deliveryServiceFactory: DeliveryServiceFactory = {
      getService: (service) =>
        service === 'SMS' ? mockEmailService : mockSmsService,
    };

    otpChallenge = new OtpChallengeService(deliveryServiceFactory, otpConfig);
  });

  void describe('validateCreateEvent()', () => {
    void it('should throw error if User is not found', async () => {
      const event: CreateAuthChallengeTriggerEvent =
        buildCreateAuthChallengeEvent([], requestOtpSmsMetaData);

      event.request.userNotFound = true;

      await rejects(
        async () => otpChallenge.createChallenge(event),
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
        async () => otpChallenge.createChallenge(event),
        Error('Invalid destination medium')
      );
    });

    void it('should throw an error if phone number is not found', async () => {
      const event: CreateAuthChallengeTriggerEvent =
        buildCreateAuthChallengeEvent([], requestOtpSmsMetaData, {});

      await rejects(
        async () => otpChallenge.createChallenge(event),
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
        async () => otpChallenge.createChallenge(event),
        Error('Phone number is not verified')
      );
    });

    void it('should throw an error if email is not found', async () => {
      const event: CreateAuthChallengeTriggerEvent =
        buildCreateAuthChallengeEvent([], requestOtpEmailMetaData, {});

      await rejects(
        async () => otpChallenge.createChallenge(event),
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
        async () => otpChallenge.createChallenge(event),
        Error('Email is not verified')
      );
    });
  });
  void describe('validateVerifyEvent()', () => {
    void it('should throw an error if OTP code is not in privateChallengeParameters', async () => {
      const event: VerifyAuthChallengeResponseTriggerEvent =
        buildVerifyAuthChallengeResponseEvent(confirmOtpMetaData, '123456');

      await rejects(
        async () => otpChallenge.verifyChallenge(event),
        Error('OTP code not found in privateChallengeParameters')
      );
    });
  });

  void describe('createChallenge()', () => {
    void describe('when SMS', () => {
      void it('should send and attach sms delivery details', async () => {
        const smsRequestCreateChallengeEvent = buildCreateAuthChallengeEvent(
          [],
          requestOtpSmsMetaData,
          phoneUserAttributes
        );
        const expectedMessageBody = 'Your verification code is';
        const expectedPhoneNumber = '+15555555555';
        const expectedOtpLength = 6;

        const createMessageMock = mock.method(
          mockSmsService,
          'createMessage',
          () => expectedMessageBody
        );
        const sendMock = mock.method(
          mockSmsService,
          'send',
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          (_param: string, _param2: string) => {
            return;
          }
        );
        const maskMock = mock.method(
          mockSmsService,
          'mask',
          () => expectedPhoneNumber
        );

        strictEqual(createMessageMock.mock.callCount(), 0);
        strictEqual(sendMock.mock.callCount(), 0);
        strictEqual(maskMock.mock.callCount(), 0);

        const result = await otpChallenge.createChallenge(
          smsRequestCreateChallengeEvent
        );

        strictEqual(createMessageMock.mock.callCount(), 1);
        strictEqual(sendMock.mock.callCount(), 1);
        strictEqual(maskMock.mock.callCount(), 1);

        const actualMessageBody = sendMock.mock.calls[0].arguments[0];
        const actualPhoneNumber = sendMock.mock.calls[0].arguments[1];

        strictEqual(actualMessageBody, expectedMessageBody);
        strictEqual(actualPhoneNumber, expectedPhoneNumber);

        // Assert that the public and private challenge parameters are set
        strictEqual(
          result.response.publicChallengeParameters.destination,
          expectedPhoneNumber
        );
        strictEqual(
          result.response.publicChallengeParameters.deliveryMedium,
          'SMS'
        );
        const actualCode = result.response.privateChallengeParameters.otpCode;
        strictEqual(actualCode.length, expectedOtpLength);
        // code is string of numbers
        notStrictEqual(actualCode.match(/^\d+$/), null);
      });
    });
    void describe('when EMAIL', () => {
      void it('should send and attach email delivery details', async () => {
        const emailRequestCreateChallengeEvent = buildCreateAuthChallengeEvent(
          [],
          requestOtpEmailMetaData,
          emailUserAttributes
        );
        const expectedMessageBody = 'Your verification code is';
        const expectedEmail = 'foo@example.com';
        const expectedOtpLength = 6;

        const createMessageMock = mock.method(
          mockEmailService,
          'createMessage',
          () => expectedMessageBody
        );
        const sendMock = mock.method(
          mockEmailService,
          'send',
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          (_param: string, _param2: string) => {
            return;
          }
        );
        const maskMock = mock.method(
          mockEmailService,
          'mask',
          () => expectedEmail
        );

        strictEqual(createMessageMock.mock.callCount(), 0);
        strictEqual(sendMock.mock.callCount(), 0);
        strictEqual(maskMock.mock.callCount(), 0);

        const result = await otpChallenge.createChallenge(
          emailRequestCreateChallengeEvent
        );

        strictEqual(createMessageMock.mock.callCount(), 1);
        strictEqual(sendMock.mock.callCount(), 1);
        strictEqual(maskMock.mock.callCount(), 1);

        const actualMessageBody = sendMock.mock.calls[0].arguments[0];
        const actualEmail = sendMock.mock.calls[0].arguments[1];
        strictEqual(actualMessageBody, expectedMessageBody);
        strictEqual(actualEmail, expectedEmail);

        // Assert that the public and private challenge parameters are set
        strictEqual(
          result.response.publicChallengeParameters.destination,
          expectedEmail
        );
        strictEqual(
          result.response.publicChallengeParameters.deliveryMedium,
          'EMAIL'
        );
        const actualCode = result.response.privateChallengeParameters.otpCode;
        strictEqual(actualCode.length, expectedOtpLength);
        // code is string of numbers
        notStrictEqual(actualCode.match(/^\d+$/), null);
      });
    });
  });

  void describe('verifyChallenge()', () => {
    const smsConfirmVerifyChallengeEvent =
      buildVerifyAuthChallengeResponseEvent(confirmOtpMetaData, mockOtpCode, {
        otpCode: mockOtpCode,
      });
    void it('should return answerCorrect: true when the OTP code is correct', async () => {
      const result = await otpChallenge.verifyChallenge(
        smsConfirmVerifyChallengeEvent
      );

      strictEqual(result.response.answerCorrect, true);
    });

    void it('should return answerCorrect: false when the OTP code wrong', async () => {
      smsConfirmVerifyChallengeEvent.request.challengeAnswer = '567890';

      const result = await otpChallenge.verifyChallenge(
        smsConfirmVerifyChallengeEvent
      );

      strictEqual(result.response.answerCorrect, false);
    });
  });
});

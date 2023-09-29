import {
  PublishCommand,
  PublishCommandInput,
  SNSClient,
} from '@aws-sdk/client-sns';
import cloneDeep from 'lodash/cloneDeep.js';
import { deepStrictEqual, rejects, strictEqual } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { OtpChallenge } from './otp_challenge.js';
import { OtpService } from '../services/otp_service.js';
import { SnsService } from '../services/sns_service.js';
import { CreateAuthChallengeTriggerEvent } from '../custom-auth/types.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockOtpCode = '123456';

class MockSnsService extends SnsService {
  constructor(expectedPublishCommandInput?: PublishCommandInput) {
    super();
    this.expectedPublishCommandInput = expectedPublishCommandInput;
  }
  expectedPublishCommandInput?: PublishCommandInput;

  public getSNSClient = (): SNSClient =>
    ({
      send: (command: PublishCommand): Promise<void> => {
        if (this.expectedPublishCommandInput) {
          deepStrictEqual(command.input, this.expectedPublishCommandInput);
        }
        return Promise.resolve();
      },
    } as any);
}

class MockOtpService extends OtpService {
  public generateOtpCode = (): string => {
    return mockOtpCode;
  };
}

class MockOtpChallenge extends OtpChallenge {
  public constructor(
    otpService = new MockOtpService(),
    smsService = new MockSnsService()
  ) {
    super(otpService, smsService);
  }
}

void describe('OTP Challenge', () => {
  const mockEvent: CreateAuthChallengeTriggerEvent = {
    version: '1',
    region: 'us-west-2',
    userPoolId: 'us-west-2_stub',
    userName: 'stub_username',
    callerContext: {
      awsSdkVersion: 'aws-sdk-unknown-unknown',
      clientId: 'stub_client_id',
    },
    triggerSource: 'CreateAuthChallenge_Authentication',
    request: {
      userAttributes: {
        sub: 'stub_username',
        'cognito:user_status': 'FORCE_CHANGE_PASSWORD',
        phone_number_verified: 'true',
        phone_number: '+15555555555',
      },
      challengeName: 'CUSTOM_CHALLENGE',
      session: [],
      userNotFound: false,
    },
    response: {
      publicChallengeParameters: {
        challenge: '',
      },
      privateChallengeParameters: {
        challenge: '',
      },
      challengeMetadata: '',
    },
  };
  const mockSMSRequest = {
    userNotFound: false,
    clientMetadata: {
      action: 'REQUEST',
      deliveryMedium: 'SMS',
      signInMethod: 'OTP',
    },
    userAttributes: {
      phone_number: '+15555555555',
      phone_number_verified: 'true',
    },
  };

  let otpChallenge: OtpChallenge;

  void beforeEach(() => {
    otpChallenge = MockOtpChallenge.instance;
  });

  void afterEach(() => {
    otpChallenge = undefined as any;
  });

  void describe('request validation', () => {
    void it('should return the event if action is not REQUEST', async () => {
      const event: any = {
        ...cloneDeep(mockEvent),
        request: {
          clientMetadata: {
            action: 'CONFIRM',
          },
        },
      };

      const result = await otpChallenge.createChallenge(event);

      deepStrictEqual(result, event);
    });
    void it('should throw error if User is not found', async () => {
      const event: any = {
        ...cloneDeep(mockEvent),
        request: {
          ...cloneDeep(mockSMSRequest),
          userNotFound: true,
        },
      };

      await rejects(
        async () => otpChallenge.createChallenge(event),
        Error('User not found')
      );
    });
    void it('should throw an error if phone number is not verified', async () => {
      const event: any = {
        ...cloneDeep(mockEvent),
        request: {
          ...cloneDeep(mockSMSRequest),
          userAttributes: {
            phone_number_verified: false,
          },
        },
      };

      await rejects(
        async () => otpChallenge.createChallenge(event),
        Error('Phone number not verified')
      );
    });
    void it('should throw an error if deliveryMedium is not SMS or EMAIL', async () => {
      const event: any = {
        ...cloneDeep(mockEvent),
        request: {
          ...cloneDeep(mockSMSRequest),
          clientMetadata: {
            ...mockSMSRequest.clientMetadata,
            deliveryMedium: 'PHONE',
          },
        },
      };

      await rejects(
        async () => otpChallenge.createChallenge(event),
        Error('Invalid destination medium')
      );
    });
  });

  void describe('options', () => {
    void it('should allow overriding the OTP length', async () => {
      process.env.otpLength = '10';
      const event: any = {
        ...cloneDeep(mockEvent),
        request: {
          ...cloneDeep(mockSMSRequest),
          clientMetadata: {
            ...mockSMSRequest.clientMetadata,
          },
        },
      };

      const otpChallenge = new MockOtpChallenge(
        new OtpService(), // Use default OTP service
        new MockSnsService()
      );

      const result = await otpChallenge.createChallenge(event);

      strictEqual(
        result.response.privateChallengeParameters.otpCode.length,
        10
      );
    });

    void it('should generate a minimum OTP code length of 6', async () => {
      process.env.otpLength = '3';
      const expectedLength = 6;
      const event: any = {
        ...cloneDeep(mockEvent),
        request: {
          ...cloneDeep(mockSMSRequest),
          clientMetadata: {
            ...mockSMSRequest.clientMetadata,
          },
        },
      };

      const otpChallenge = new MockOtpChallenge(
        new OtpService(), // Use default OTP service
        new MockSnsService()
      );

      const result = await otpChallenge.createChallenge(event);

      strictEqual(
        result.response.privateChallengeParameters.otpCode.length,
        expectedLength
      );
    });
  });

  void describe('SMS', () => {
    const smsEvent = {
      ...cloneDeep(mockEvent),
      request: {
        ...cloneDeep(mockSMSRequest),
      },
    } as CreateAuthChallengeTriggerEvent;

    void it('should send an SMS via SNS and attach delivery details', async () => {
      const expectedPublishCommand: PublishCommandInput = {
        PhoneNumber: '+15555555555',
        Message: `Your verification code is: ${mockOtpCode}`,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      };

      const mockSmsService = new MockSnsService(expectedPublishCommand);

      const otpChallenge = new MockOtpChallenge(
        new MockOtpService(),
        mockSmsService
      );

      const result = await otpChallenge.createChallenge(smsEvent);

      // Assert that the public and private challenge parameters are set
      strictEqual(
        result.response.publicChallengeParameters.destination,
        '+*******5555'
      );
      strictEqual(
        result.response.publicChallengeParameters.deliveryMedium,
        'SMS'
      );
      strictEqual(
        result.response.privateChallengeParameters.otpCode,
        mockOtpCode
      );
    });

    void it('should attach SNS attributes when provided', async () => {
      process.env.snsSenderId = 'stub_sender_id';
      process.env.originationNumber = 'stub_origination_number';

      const expectedPublishCommand: PublishCommandInput = {
        PhoneNumber: '+15555555555',
        Message: `Your verification code is: ${mockOtpCode}`,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: 'stub_sender_id',
          },
          'AWS.SNS.SMS.OriginationNumber': {
            DataType: 'String',
            StringValue: 'stub_origination_number',
          },
        },
      };

      const mockSmsService = new MockSnsService(expectedPublishCommand);

      const otpChallenge = new MockOtpChallenge(
        new MockOtpService(),
        mockSmsService
      );

      await otpChallenge.createChallenge(smsEvent);
    });

    void it('should return answerCorrect: true when the OTP code is correct', async () => {
      const event: any = {
        ...cloneDeep(mockEvent),
        request: {
          clientMetadata: {
            action: 'CONFIRM',
            signInMethod: 'OTP',
          },
          challengeAnswer: mockOtpCode,
          privateChallengeParameters: {
            otpCode: mockOtpCode,
          },
        },
      };

      const result = await otpChallenge.verifyChallenge(event);

      strictEqual(result.response.answerCorrect, true);
    });

    void it('should return answerCorrect: false when the OTP code wrong', async () => {
      const event: any = {
        ...cloneDeep(mockEvent),
        request: {
          clientMetadata: {
            action: 'CONFIRM',
            signInMethod: 'OTP',
          },
          challengeAnswer: '789012',
          privateChallengeParameters: {
            otpCode: mockOtpCode,
          },
        },
      };

      const result = await otpChallenge.verifyChallenge(event);

      strictEqual(result.response.answerCorrect, false);
    });
  });
});

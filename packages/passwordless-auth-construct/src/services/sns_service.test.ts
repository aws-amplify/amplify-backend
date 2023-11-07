import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { SnsService } from './sns_service.js';
import { SnsServiceConfig } from '../types.js';

/**
 * A mock SNSClient
 */
class MockSnsClient extends SNSClient {
  /**
   * Mock SNSClient send method.
   */
  send(): Promise<void> {
    return Promise.resolve();
  }
}

void describe('SNS Service', () => {
  let mockSnsClient: SNSClient;
  let snsConfig: SnsServiceConfig;
  let snsService: SnsService;

  beforeEach(() => {
    mockSnsClient = new MockSnsClient();
    snsConfig = {};
  });

  void describe('send()', () => {
    void it('should attach SNS attributes when provided', async () => {
      const senderId = 'stub_sender_id';
      const originationNumber = 'stub_origination_number';
      const phoneNumber = '+15555555555';
      const message = 'Hello world';

      const expectedAttributes = {
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: senderId,
          },
          'AWS.SNS.SMS.OriginationNumber': {
            DataType: 'String',
            StringValue: originationNumber,
          },
        },
        PhoneNumber: phoneNumber,
        Message: message,
      };

      const sendMock = mock.method(mockSnsClient, 'send');

      const snsConfig: SnsServiceConfig = {
        senderId: senderId,
        originationNumber: originationNumber,
      };

      const mockSmsService = new SnsService(mockSnsClient, snsConfig);

      strictEqual(sendMock.mock.callCount(), 0);
      await mockSmsService.send(message, phoneNumber);
      const actualPublishCommand = sendMock.mock.calls[0]
        .arguments[0] as PublishCommand;
      strictEqual(sendMock.mock.callCount(), 1);
      deepStrictEqual(actualPublishCommand.input, expectedAttributes);
    });
  });

  void describe('mask()', () => {
    beforeEach(() => {
      snsService = new SnsService(mockSnsClient, snsConfig);
    });
    void it('should mask phone numbers', () => {
      const mockSmsService = snsService;
      const phoneNumber = '+15555555555';
      const maskedPhoneNumber = mockSmsService.mask(phoneNumber);
      strictEqual(maskedPhoneNumber, '+*******5555');
    });

    void it('should mask phone numbers with less than 8 digits', () => {
      const mockSmsService = snsService;
      const phoneNumber = '+155555';
      const maskedPhoneNumber = mockSmsService.mask(phoneNumber);
      strictEqual(maskedPhoneNumber, '+*********55');
    });
  });

  void describe('createMessage()', () => {
    beforeEach(() => {
      snsService = new SnsService(mockSnsClient, snsConfig);
    });
    void it('should create a message', () => {
      const mockSmsService = snsService;
      const otpCode = '123456';
      const message = mockSmsService.createMessage(otpCode);
      strictEqual(message, `Your verification code is: ${otpCode}`);
    });
  });
});

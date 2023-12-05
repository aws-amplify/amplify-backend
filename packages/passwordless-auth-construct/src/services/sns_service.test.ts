import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { SnsService } from './sns_service.js';
import { SnsServiceConfig } from '../types.js';
import { codeOrLinkPlaceholder } from '../constants.js';

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

  beforeEach(() => {
    mockSnsClient = new MockSnsClient();
  });

  void describe('send()', () => {
    void it('should attach SNS attributes when provided', async () => {
      const senderId = 'stub_sender_id';
      const originationNumber = 'stub_origination_number';
      const phoneNumber = '+15555555555';
      const secret = '123456';

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
          'AWS.MM.SMS.OriginationNumber': {
            DataType: 'String',
            StringValue: originationNumber,
          },
        },
        PhoneNumber: phoneNumber,
        Message: 'your code is 123456',
      };

      const sendMock = mock.method(mockSnsClient, 'send');

      const snsConfig: SnsServiceConfig = {
        otp: {
          senderId: senderId,
          originationNumber: originationNumber,
          message: `your code is ${codeOrLinkPlaceholder}`,
        },
      };

      const mockSmsService = new SnsService(mockSnsClient, snsConfig);

      strictEqual(sendMock.mock.callCount(), 0);
      await mockSmsService.send(secret, phoneNumber, 'OTP');
      const actualPublishCommand = sendMock.mock.calls[0]
        .arguments[0] as PublishCommand;
      strictEqual(sendMock.mock.callCount(), 1);
      deepStrictEqual(actualPublishCommand.input, expectedAttributes);
    });
  });
});

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { SesServiceConfig } from '../types.js';
import { SesService } from './ses_service.js';
import { codeOrLinkPlaceholder } from '../constants.js';

/**
 * A mock SESClient
 */
class MockSesClient extends SESClient {
  /**
   * Mock SESClient send method.
   */
  send(): Promise<void> {
    return Promise.resolve();
  }
}

void describe('SES Service', () => {
  let mockSesClient: SESClient;
  let sesConfig: SesServiceConfig;
  let sesService: SesService;

  beforeEach(() => {
    mockSesClient = new MockSesClient();
    sesConfig = {};
  });

  void describe('send()', () => {
    void it('should attach SES attributes when provided', async () => {
      const fromAddress = 'foo@bar.com';
      const toAddress = 'baz@bar.com';
      const secret = '123456';
      const emailSubject = 'Passwordless Auth OTP';
      const emailBody = `your code is: ${codeOrLinkPlaceholder}`;
      const expectedAttributes = {
        Destination: {
          ToAddresses: ['baz@bar.com'],
        },
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: 'your code is: 123456',
            },
            Text: {
              Charset: 'UTF-8',
              Data: 'your code is: 123456',
            },
          },
          Subject: {
            Charset: 'UTF-8',
            Data: emailSubject,
          },
        },
        Source: 'foo@bar.com',
      };

      const sendMock = mock.method(mockSesClient, 'send');

      const sesConfig: SesServiceConfig = {
        otp: {
          fromAddress: fromAddress,
          subject: emailSubject,
          body: emailBody,
        },
      };

      const mockSmsService = new SesService(mockSesClient, sesConfig);

      strictEqual(sendMock.mock.callCount(), 0);
      await mockSmsService.send(secret, toAddress, 'OTP');
      const actualEmailCommand = sendMock.mock.calls[0]
        .arguments[0] as SendEmailCommand;
      strictEqual(sendMock.mock.callCount(), 1);
      deepStrictEqual(actualEmailCommand.input, expectedAttributes);
    });
  });

  void describe('mask()', () => {
    beforeEach(() => {
      sesService = new SesService(mockSesClient, sesConfig);
    });
    void it('should mask email', () => {
      const mockSmsService = sesService;
      const email = 'foobar@baz.com';
      const maskedEmail = mockSmsService.mask(email);
      strictEqual(maskedEmail, 'f****r@***.***');
    });

    void it('should mask email with less than 3 digits', () => {
      const mockSmsService = sesService;
      const email = 'fo@bar.com';
      const maskedEmail = mockSmsService.mask(email);
      strictEqual(maskedEmail, 'f****o@***.***');
    });
  });
});

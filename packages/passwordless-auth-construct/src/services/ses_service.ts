import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from '../logger.js';
import {
  DeliveryMedium,
  DeliveryService,
  EmailConfigOptions,
  SesServiceConfig,
  SignInMethod,
} from '../types.js';
import { codeOrLinkPlaceholder } from '../constants.js';

/**
 * SNS service Implementation.
 * Sends message via SNS client.
 */
export class SesService implements DeliveryService {
  deliveryMedium: DeliveryMedium = 'EMAIL';

  /**
   * SES Service constructor
   * @param sesClient - SES Client to use for sending messages. Defaults to SESClient. Can be overridden for testing.
   * @param config - SES Service configuration
   */
  constructor(private sesClient: SESClient, private config: SesServiceConfig) {}

  public send = async (
    secret: string,
    destination: string,
    challengeType: SignInMethod
  ): Promise<void> => {
    const config = this.getConfig(challengeType);
    const body = config.body.replace(codeOrLinkPlaceholder, secret);
    const emailCommand = new SendEmailCommand({
      Destination: { ToAddresses: [destination] },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: body,
          },
          Text: {
            Charset: 'UTF-8',
            Data: body,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: config.subject,
        },
      },
      Source: config.fromAddress,
    });

    // Send Email via SES
    const output = await this.sesClient.send(emailCommand);
    logger.debug(`SMS sent: ${JSON.stringify(output, null, 2)}`);
  };

  private getConfig = (challengeType: SignInMethod): EmailConfigOptions => {
    switch (challengeType) {
      case 'MAGIC_LINK':
        if (!this.config.magicLink) {
          throw Error(
            'No Magic Link configuration found. Magic Link via email may be disabled.'
          );
        }
        return this.config.magicLink;
      case 'OTP':
        if (!this.config.otp) {
          throw Error(
            'No OTP configuration found. OTP via email may be disabled.'
          );
        }
        return this.config.otp;
    }
  };
}

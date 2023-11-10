import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from '../logger.js';
import { DeliveryMedium, DeliveryService, SesServiceConfig } from '../types.js';

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

  public send = async (message: string, destination: string): Promise<void> => {
    // TODO: Add support for custom email input
    const emailCommand = new SendEmailCommand({
      Destination: { ToAddresses: [destination] },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: message,
          },
          Text: {
            Charset: 'UTF-8',
            Data: message,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: this.config.emailSubject,
        },
      },
      Source: this.config.fromAddress,
    });

    // Send Email via SES
    const output = await this.sesClient.send(emailCommand);
    logger.debug(`SMS sent: ${JSON.stringify(output, null, 2)}`);
  };

  public mask = (destination: string): string => {
    const [start, end] = destination.split('@');
    const maskedDomain = end
      .split('.')
      .map((d) => {
        if (d.length <= 3) {
          return new Array(d.length).fill('*').join('');
        }

        return `${d.slice(0, 1)}${new Array(d.length - 2)
          .fill('*')
          .join('')}${d.slice(-1)}`;
      })
      .join('.');
    return `${start.slice(0, 1)}****${start.slice(-1)}@${maskedDomain}`;
  };

  /**
   * Create Email content
   * @param secretCode The OTP code to send
   * @returns The Email content
   */
  public createMessage = (secretCode: string): string => {
    return `Your verification code is: ${secretCode}`;
  };
}

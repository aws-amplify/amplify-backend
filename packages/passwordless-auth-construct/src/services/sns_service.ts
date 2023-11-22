import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { logger } from '../logger.js';
import { DeliveryMedium, DeliveryService, SnsServiceConfig } from '../types.js';

/**
 * SNS service Implementation.
 * Sends message via SNS client.
 */
export class SnsService implements DeliveryService {
  deliveryMedium: DeliveryMedium = 'SMS';

  /**
   * SNS Service constructor
   * @param snsClient - SNS Client to use for sending messages. Defaults to SNSClient. Can be overridden for testing.
   * @param config - SNS Service configuration
   */
  constructor(private snsClient: SNSClient, private config: SnsServiceConfig) {}

  public send = async (message: string, destination: string): Promise<void> => {
    // SNS attributes
    const attributes: PublishCommand['input']['MessageAttributes'] = {};
    if (this.config.senderId && this.config.senderId !== '') {
      attributes['AWS.SNS.SMS.SenderID'] = {
        DataType: 'String',
        StringValue: this.config.senderId,
      };
    }
    if (this.config.originationNumber && this.config.originationNumber !== '') {
      attributes['AWS.SNS.SMS.OriginationNumber'] = {
        DataType: 'String',
        StringValue: this.config.originationNumber,
      };
    }

    // SNS Command
    const snsCommand = new PublishCommand({
      Message: message,
      PhoneNumber: destination,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          StringValue: 'Transactional',
          DataType: 'String',
        },
        ...attributes,
      },
    });

    // Send SMS via SNS
    const output = await this.snsClient.send(snsCommand);
    logger.debug(`SMS sent: ${JSON.stringify(output, null, 2)}`);
  };

  public mask = (destination: string): string => {
    const show = destination.length < 8 ? 2 : 4;
    return `+${new Array(11 - show).fill('*').join('')}${destination.slice(
      -show
    )}`;
  };

  /**
   * Create SMS message content
   * @param code The OTP code to send
   * @returns The SMS content
   */
  public createMessage = (code: string): string => {
    const defaultMessage = 'Your verification code is';
    const customMessage = this.config.smsMessage;
    return `${customMessage ?? defaultMessage}: ${code}`;
  };
}

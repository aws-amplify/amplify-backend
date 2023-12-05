import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { logger } from '../logger.js';
import {
  DeliveryMedium,
  DeliveryService,
  SignInMethod,
  SmsConfigOptions,
  SnsServiceConfig,
} from '../types.js';
import { codeOrLinkPlaceholder } from '../constants.js';

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

  public send = async (
    secret: string,
    destination: string,
    challengeType: SignInMethod
  ): Promise<void> => {
    const config = this.getConfig(challengeType);
    const message = config.message.replace(codeOrLinkPlaceholder, secret);

    // SNS attributes
    const attributes: PublishCommand['input']['MessageAttributes'] = {};
    if (config.senderId) {
      attributes['AWS.SNS.SMS.SenderID'] = {
        DataType: 'String',
        StringValue: config.senderId,
      };
    }
    attributes['AWS.MM.SMS.OriginationNumber'] = {
      DataType: 'String',
      StringValue: config.originationNumber,
    };

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

  private getConfig = (challengeType: SignInMethod): SmsConfigOptions => {
    switch (challengeType) {
      case 'MAGIC_LINK':
        throw Error('SMS is not supported for magic link');
      case 'OTP':
        if (!this.config.otp) {
          throw Error(
            'No OTP configuration found. OTP via SMS may be disabled.'
          );
        }
        return this.config.otp;
    }
  };
}

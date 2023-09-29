import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { logger } from '../logger.js';
import { DeliveryService } from './types.js';
import isEmpty from 'lodash/isEmpty.js';

/**
 * SNS service Implementation.
 * Sends message via SNS client.
 */
export class SnsService implements DeliveryService {
  public send = async (
    message: string,
    destination: string,
    region: string
  ): Promise<void> => {
    const { originationNumber, snsSenderId, regionEnv } = process.env;
    const snsRegion = !isEmpty(regionEnv) ? regionEnv! : region;

    // SNS attributes
    const attributes: PublishCommand['input']['MessageAttributes'] = {};
    if (!isEmpty(snsSenderId)) {
      attributes['AWS.SNS.SMS.SenderID'] = {
        DataType: 'String',
        StringValue: snsSenderId,
      };
    }
    if (!isEmpty(originationNumber)) {
      attributes['AWS.SNS.SMS.OriginationNumber'] = {
        DataType: 'String',
        StringValue: originationNumber,
      };
    }

    // SMS input
    const smsInput = {
      Message: message,
      PhoneNumber: destination,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          StringValue: 'Transactional',
          DataType: 'String',
        },
        ...attributes,
      },
    };

    // Send SMS via SNS
    const snsClient = this.getSNSClient(snsRegion);
    const output = await snsClient.send(new PublishCommand(smsInput));
    logger.debug(`SMS sent: ${JSON.stringify(output, null, 2)}`);
  };

  public mask = (phoneNumber: string): string => {
    const show = phoneNumber.length < 8 ? 2 : 4;
    return `+${new Array(11 - show).fill('*').join('')}${phoneNumber.slice(
      -show
    )}`;
  };

  /**
   * Get SNS client
   * @param region The AWS region to get the SNS client for
   * @returns SNSClient
   */
  protected getSNSClient = (region: string): SNSClient => {
    return new SNSClient({ region: region });
  };
}

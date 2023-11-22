import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { SignedMagicLink } from '../models/magic_link.js';
import {
  MagicLinkStorageConfig,
  RemovedItem,
  StorageService,
} from '../types.js';
import { logger } from '../logger.js';

/**
 * A service for storing Magic Links in DynamoDB.
 *
 * Links are stored with the user ID (sub) as the unique identifier.
 */
export class MagicLinkStorageService
  implements StorageService<SignedMagicLink>
{
  /**
   * Creates a MagicLinkStorageService instance.
   * @param client - The DynamoDB client.
   * @param storageConfig - The config for the service.
   */
  constructor(
    private client: DynamoDBDocumentClient,
    private storageConfig: MagicLinkStorageConfig
  ) {}

  public save = async (
    userId: string,
    magicLink: SignedMagicLink
  ): Promise<void> => {
    const { iat, exp, keyId } = magicLink;
    const { tableName } = this.storageConfig;
    if (!tableName) {
      throw Error('Configuration Error: DynamoDD table must be defined.');
    }
    await this.client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          userId,
          iat,
          exp,
          kmsKeyId: keyId,
        },
      })
    );
  };

  public remove = async (
    userId: string,
    magicLink: SignedMagicLink
  ): Promise<RemovedItem> => {
    const { iat, exp } = magicLink;
    const { tableName } = this.storageConfig;
    if (!tableName) {
      throw Error(
        'Configuration Error: DynamoDD table, and KMS key must be defined.'
      );
    }
    try {
      const response = await this.client.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            userId: userId,
          },
          ReturnValues: 'ALL_OLD',
          ConditionExpression:
            'attribute_exists(#iat) AND #iat = :iat AND attribute_exists(#exp) AND #exp = :exp',
          ExpressionAttributeNames: {
            '#iat': 'iat',
            '#exp': 'exp',
          },
          ExpressionAttributeValues: {
            ':iat': iat,
            ':exp': exp,
          },
        })
      );
      const item = response.Attributes;
      if (!item?.kmsKeyId || typeof item.kmsKeyId !== 'string') {
        throw new Error('Failed to determine KMS Key ID');
      }
      return item;
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        logger.error('Attempt to use invalid magic link');
        return;
      }
      throw err;
    }
  };
}

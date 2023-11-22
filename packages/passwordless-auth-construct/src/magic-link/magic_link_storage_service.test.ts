import {
  DeleteCommandInput,
  DynamoDBDocumentClient,
  PutCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { deepStrictEqual, rejects, strictEqual } from 'node:assert';
import { describe, it, mock } from 'node:test';
import { MagicLinkStorageService } from './magic_link_storage_service.js';
import { MagicLink } from '../models/magic_link.js';

const mockSignature = new Uint8Array([1]);

class MockDynamoDBDocumentClient<T> extends DynamoDBDocumentClient {
  constructor(private sendCallback: () => T) {
    super(new DynamoDBClient());
  }

  async send(): Promise<T> {
    return this.sendCallback();
  }
}

void describe('MagicLinkStorageService', () => {
  const username = 'user1';
  const userId = '1234-5678-00001111-1234-5678';
  const userPoolId = '1234-1234-99991234-1234-1234';
  const kmsKeyId = 'key123';
  const tableName = 'table123';
  const magicLink = MagicLink.create(userPoolId, username, 60).withSignature(
    mockSignature,
    kmsKeyId
  );
  const { iat, exp } = magicLink;

  void describe('save()', () => {
    void it('should invoke the client with a PutCommand', async () => {
      const mockClient: DynamoDBDocumentClient = new MockDynamoDBDocumentClient(
        () => {
          return {};
        }
      );
      const service = new MagicLinkStorageService(mockClient, {
        tableName: tableName,
      });
      const sendMock = mock.method(mockClient, 'send');
      strictEqual(sendMock.mock.callCount(), 0);
      await service.save(userId, magicLink);
      const input = sendMock.mock.calls[0].arguments[0]
        .input as PutCommandInput;
      strictEqual(sendMock.mock.callCount(), 1);
      deepStrictEqual(input.Item, {
        userId,
        iat,
        exp,
        kmsKeyId,
      });
      strictEqual(input.TableName, tableName);
    });
  });

  void describe('remove()', () => {
    void it('should invoke the client with a DeleteCommand', async () => {
      const mockClient: DynamoDBDocumentClient = new MockDynamoDBDocumentClient(
        () => {
          return { Attributes: { kmsKeyId } };
        }
      );
      const service = new MagicLinkStorageService(mockClient, {
        tableName: tableName,
      });
      const sendMock = mock.method(mockClient, 'send');
      strictEqual(sendMock.mock.callCount(), 0);
      await service.remove(userId, magicLink);
      const input = sendMock.mock.calls[0].arguments[0]
        .input as DeleteCommandInput;
      strictEqual(sendMock.mock.callCount(), 1);
      deepStrictEqual(input.Key, { userId });
      strictEqual(input.TableName, tableName);
    });

    void it('should throw if no KMS Key ID is returned', async () => {
      const mockClient: DynamoDBDocumentClient = new MockDynamoDBDocumentClient(
        () => {
          return { Attributes: {} };
        }
      );
      const service = new MagicLinkStorageService(mockClient, {
        tableName: tableName,
      });

      await rejects(
        async () => service.remove(userId, magicLink),
        Error('Failed to determine KMS Key ID')
      );
    });
  });
});

import { describe, it, mock } from 'node:test';
import { strictEqual } from 'node:assert';
import {
  GetPublicKeyCommandOutput,
  KMSClient,
  SignCommandInput,
  SignCommandOutput,
} from '@aws-sdk/client-kms';
import { KMSService } from './kms_service.js';
import { MagicLink } from '../models/magic_link.js';
import { createHash } from 'node:crypto';
import {
  publicKey,
  testMagicLink,
  testSignedMagicLink,
  testSignedMagicLinkBadIat,
} from '../mocks/magic_link.js';

/**
 * A mock client for issuing SignCommand.
 */
class MockKmsSignClient extends KMSClient {
  send(): Promise<SignCommandOutput> {
    return Promise.resolve({
      $metadata: {},
      Signature: new Uint8Array([1]),
    });
  }
}

/**
 * A mock client for issuing GetPublicKeyCommand.
 */
class MockKmsGetPublicKeyClient extends KMSClient {
  constructor(private publicKey: string) {
    super();
  }
  send(): Promise<GetPublicKeyCommandOutput> {
    return Promise.resolve({
      $metadata: {},
      PublicKey: Buffer.from(this.publicKey, 'base64'),
    });
  }
}

void describe('KMSService', () => {
  void describe('sign', () => {
    void it('should invoke KMS Client with the correct keyId and message', async () => {
      const mockClient: KMSClient = new MockKmsSignClient();
      const sendMock = mock.method(mockClient, 'send', {});
      const service = new KMSService(mockClient, { keyId: '1234' });
      const { data } = MagicLink.create('1234', 'user1', 60);
      strictEqual(sendMock.mock.callCount(), 0);
      await service.sign(data);
      strictEqual(sendMock.mock.callCount(), 1);
      const input = sendMock.mock.calls[0].arguments[0]
        .input as SignCommandInput;
      strictEqual(input.KeyId, '1234');
      const expectedMessage = createHash('sha512').end(data).digest();
      strictEqual(input.Message?.toString(), expectedMessage.toString());
    });
  });

  void describe('verify', () => {
    const keyId = '1234567890';

    void it('should return true when the signature is correct', async () => {
      const mockClient: KMSClient = new MockKmsGetPublicKeyClient(publicKey);
      const service = new KMSService(mockClient, { keyId: keyId });
      const { data, signature } = testSignedMagicLink;
      const isValid = await service.verify(keyId, data, signature);
      strictEqual(isValid, true);
    });

    void it('should return false when the incorrect public key is used', async () => {
      // A public key that is known to be incorrect.
      const badPublicKey =
        // eslint-disable-next-line spellcheck/spell-checker
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwa0+/ErkC4rB2X4VSllfbI3vYLvbw9669ZGi82YrpysGDqOnfx5vyDFpd9d8k6VkCTNHnqFVaKzmQyK7TjwZusQkpBgxcesphFaa1slg21nYyh4C/NJoY1b/6+78haxo9/RYNSIIhCnsiv9s0JoLbsFSZH6b/rW9x/U3sLfKj+bLxyViZp2AzjHKdw+mD/NpSmNl2Z+FmAVTVMOWYn/GWd6lNE1vZYfZYi5o2GgSA/syw+6IGuMwc/l0we3/4+8MPVtI/h2aWiE/lmfwZCGD5ZE4L47IO7TcUZvwaxjwEx+E+AtahxdOJ2cQbxNe5Daqpl86O0M2DO67XmF8r/Ol2wIDAQAB';
      const mockClient: KMSClient = new MockKmsGetPublicKeyClient(badPublicKey);
      const service = new KMSService(mockClient, { keyId: keyId });
      const { data, signature } = testSignedMagicLink;
      const isValid = await service.verify(keyId, data, signature);
      strictEqual(isValid, false);
    });

    void it('should return false when the incorrect signature is used', async () => {
      // A known bad signature that was generated with the incorrect info.
      const badSignature = new Uint8Array([
        36, 95, 108, 163, 160, 131, 65, 45, 211, 18, 107, 238, 245, 107, 82, 48,
        205, 54, 142, 85, 215, 127, 13, 183, 85, 26, 221, 86, 226, 19, 59, 74,
        110, 59, 224, 168, 96, 41, 52, 117, 18, 40, 229, 189, 108, 70, 126, 87,
        122, 16, 38, 83, 218, 219, 74, 248, 141, 141, 224, 55, 42, 88, 242, 8,
        227, 40, 11, 131, 176, 20, 224, 239, 174, 102, 143, 22, 78, 163, 196,
        212, 132, 161, 131, 20, 254, 85, 241, 200, 42, 146, 157, 57, 223, 178,
        254, 7, 222, 179, 210, 151, 151, 202, 103, 237, 38, 35, 83, 47, 247,
        207, 117, 4, 45, 82, 205, 169, 178, 113, 134, 16, 132, 70, 110, 90, 124,
        28, 91, 6, 27, 84, 233, 69, 249, 186, 52, 224, 160, 156, 92, 107, 12,
        157, 81, 107, 168, 117, 186, 7, 70, 74, 239, 13, 149, 43, 106, 50, 229,
        39, 82, 42, 156, 218, 193, 73, 107, 232, 76, 163, 54, 97, 232, 98, 116,
        144, 226, 232, 180, 33, 18, 32, 185, 183, 3, 7, 70, 107, 29, 101, 12,
        62, 18, 241, 113, 62, 77, 57, 96, 198, 218, 77, 139, 31, 58, 239, 59,
        173, 17, 70, 187, 41, 71, 131, 142, 234, 85, 244, 40, 91, 95, 68, 151,
        213, 198, 162, 199, 40, 176, 180, 250, 61, 227, 27, 140, 132, 213, 170,
        76, 205, 230, 73, 229, 138, 34, 115, 54, 6, 23, 116, 238, 214, 73, 19,
        88, 189, 0, 154,
      ]);
      const mockClient: KMSClient = new MockKmsGetPublicKeyClient(publicKey);
      const service = new KMSService(mockClient, { keyId: keyId });
      const { data } = testMagicLink.withSignature(badSignature, keyId);
      const isValid = await service.verify(keyId, data, badSignature);
      strictEqual(isValid, false);
    });

    void it('should return false when the incorrect iat is used', async () => {
      const mockClient: KMSClient = new MockKmsGetPublicKeyClient(publicKey);
      const service = new KMSService(mockClient, { keyId: keyId });
      const { data, signature } = testSignedMagicLinkBadIat;
      const isValid = await service.verify(keyId, data, signature);
      strictEqual(isValid, false);
    });

    void it('should only result in one call to get the public key multiple verify calls are made with the same key id', async () => {
      const mockClient: KMSClient = new MockKmsGetPublicKeyClient(publicKey);
      const sendMock = mock.method(mockClient, 'send', {});
      const service = new KMSService(mockClient, { keyId: keyId });
      const { data, signature } = testSignedMagicLink;
      strictEqual(sendMock.mock.callCount(), 0);
      await service.verify(keyId, data, signature);
      strictEqual(sendMock.mock.callCount(), 1);
      const newMagicLink = MagicLink.create('userPoolId', 'username', 60);
      await service.verify(keyId, newMagicLink.data, signature);
      strictEqual(sendMock.mock.callCount(), 1);
    });
  });
});

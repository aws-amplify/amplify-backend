import {
  GetPublicKeyCommand,
  KMSClient,
  SignCommand,
} from '@aws-sdk/client-kms';
import {
  KeyObject,
  constants,
  createHash,
  createPublicKey,
  createVerify,
} from 'node:crypto';
import { KmsConfig, SigningService } from '../types.js';
import { logger } from '../logger.js';

/**
 * A service for interacting with AWS KMS (Key Management Service).
 */
export class KMSService implements SigningService {
  /**
   * Creates a new KMSService instance.
   * @param client - The KMSClient.
   * @param config - Configuration for the service.
   */
  constructor(private client: KMSClient, private config: KmsConfig) {}

  private publicKeys: Record<string, KeyObject | undefined> = {};

  /**
   * Creates a signature from a given object and context.
   * @param data - The data being signed.
   * @returns A signature.
   */
  public sign = async (data: Uint8Array) => {
    const { keyId } = this.config;
    if (keyId == null) {
      throw Error('KMS Key ID is required.');
    }
    const { Signature: signature } = await this.client.send(
      new SignCommand({
        KeyId: keyId,
        Message: createHash('sha512').end(data).digest(),
        SigningAlgorithm: 'RSASSA_PSS_SHA_512',
        MessageType: 'DIGEST',
      })
    );
    if (!signature) {
      throw new Error('Failed to create signature with KMS');
    }
    return { keyId, signature };
  };

  /**
   * Verifies the signature by downloading the public key from KMS, generating
   * A signature
   * @param keyId - The ID of the KMS key.
   * @param data - The data being signed.
   * @param signature - The signature to verify.
   * @returns true or false indicating if the signature is valid.
   */
  public verify = async (
    keyId: string,
    data: Uint8Array,
    signature: Uint8Array
  ): Promise<boolean> => {
    logger.debug('Downloading KMS public key');
    const key = this.publicKeys[keyId] ?? (await this.downloadPublicKey(keyId));
    this.publicKeys[keyId] = key;
    logger.debug('Verifying key signature');
    const verifier = createVerify('RSA-SHA512');
    verifier.update(data);
    return verifier.verify(
      {
        key: key,
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
      },
      signature
    );
  };

  private downloadPublicKey = async (keyId: string): Promise<KeyObject> => {
    const { PublicKey: publicKey } = await this.client.send(
      new GetPublicKeyCommand({
        KeyId: keyId,
      })
    );
    if (!publicKey) {
      throw new Error('Failed to download public key from KMS');
    }
    return createPublicKey({
      key: publicKey as Buffer,
      format: 'der',
      // eslint-disable-next-line spellcheck/spell-checker
      type: 'spki',
    });
  };
}

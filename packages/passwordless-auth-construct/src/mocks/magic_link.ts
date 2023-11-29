import { MagicLink } from '../models/magic_link.js';

/**
 * A MagicLink implementation that exposes the constructor for the purposes of
 * creating Magic Links inside tests that do not depend on the current time.
 */
class TestMagicLink extends MagicLink {
  constructor(userPoolId: string, username: string, iat: number, exp: number) {
    super(userPoolId, username, iat, exp);
  }
}

const kmsKeyId = 'kmsKey123';
/** A fake user pool id that was used when creating the signature below */
const userPoolId = '1234';
/** A fake username that was used when creating the signature below */
const username = 'user1';
/** An issued at date that was used when creating the signature below */
const iat = 1700245398;
/** An expiry date that was used when creating the signature below */
const exp = 1700245458;
/**
 * A signature that was generated using the private key that corresponds to
 * the below public key along with the above username, iat, and exp.
 * Note: The private key was generated solely for the purpose of this test
 * has since been deleted.
 */
const signature = new Uint8Array([
  143, 250, 24, 51, 105, 174, 8, 30, 26, 90, 159, 95, 229, 109, 149, 107, 63,
  141, 245, 171, 245, 41, 161, 46, 161, 8, 160, 67, 244, 142, 5, 30, 64, 126,
  67, 148, 246, 51, 32, 214, 8, 97, 79, 8, 2, 227, 209, 7, 46, 93, 136, 54, 124,
  31, 46, 157, 150, 117, 106, 214, 126, 47, 253, 81, 176, 74, 13, 70, 77, 1, 72,
  6, 180, 92, 140, 126, 189, 33, 181, 49, 84, 89, 18, 157, 174, 141, 139, 34,
  12, 42, 85, 82, 68, 172, 101, 70, 64, 240, 233, 100, 251, 142, 248, 240, 183,
  4, 240, 213, 47, 248, 37, 83, 160, 84, 73, 231, 46, 91, 152, 143, 96, 163,
  200, 208, 68, 102, 119, 2, 52, 62, 233, 214, 235, 51, 1, 148, 215, 139, 155,
  196, 29, 137, 254, 47, 55, 30, 191, 136, 132, 187, 17, 57, 155, 2, 251, 78,
  194, 68, 247, 51, 162, 104, 46, 23, 38, 61, 148, 166, 130, 186, 30, 217, 233,
  11, 143, 241, 166, 61, 105, 254, 107, 121, 55, 164, 80, 238, 217, 246, 139,
  39, 239, 95, 40, 204, 32, 42, 97, 16, 211, 54, 163, 111, 247, 27, 29, 207, 62,
  242, 139, 230, 134, 39, 81, 169, 124, 225, 67, 137, 207, 179, 154, 247, 222,
  115, 91, 253, 87, 254, 252, 4, 251, 114, 118, 163, 178, 31, 143, 111, 66, 44,
  2, 252, 15, 104, 47, 111, 19, 17, 231, 135, 61, 159, 27, 144, 4, 36,
]);

/**
 * A Public key that corresponds to the private key that was used to generate
 * data for the purpose of testing
 */
export const publicKey =
  // eslint-disable-next-line spellcheck/spell-checker
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAk1Io16OFvSSGd/BDxa+ccM5lYE9/e72ZB1tOEhmNVj39a2Q5bZU0OZNaBZNKqK6Q4YkXGowI4Hz7eGUSXW7m1KMeLtltv/73E6MbVwn0lAX8FC7KiZCk0enbGeYdz2cwV3dG6Dr3tvWEqC03hCe7NuAtMUh+kfM5mZKgVur9TVUoj6q57dkGj/eUDJgR4/3VCPUKmupiENUzFQsM1Gb6cj+1HTYUFLuZnWNJA3IMyNK/H5JCrWpSGAp7x+HD8KpZ0+BRdIFlkM7t5FizT/IXJUnh61NgBzelD5pbLXFGKXrM2nePd25lHOTij2k2809gFgCLeuc7hxmetaLU/mNePwIDAQAB';

/**
  A magic link to be used in tests.
 */
export const testMagicLink = new TestMagicLink(userPoolId, username, iat, exp);

/** A signed magic link to be used in tests */
export const testSignedMagicLink = testMagicLink.withSignature(
  signature,
  kmsKeyId
);

/** A signed magic link with a known bad iat causing the signature to be invalid. */
export const testSignedMagicLinkBadIat = new TestMagicLink(
  userPoolId,
  username,
  iat + 1000,
  exp
).withSignature(signature, kmsKeyId);

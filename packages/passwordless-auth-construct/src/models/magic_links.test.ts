import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { MagicLink, SignedMagicLink } from './magic_link.js';
import { testSignedMagicLink } from '../mocks/magic_link.js';

void describe('MagicLink', () => {
  void describe('create', () => {
    void it('creates a new MagicLink with the correct expiry', async () => {
      const magicLink = MagicLink.create('poolId', 'username', 60);
      const { iat, exp } = magicLink;
      strictEqual(exp - iat, 60);
    });
  });
});

void describe('SignedMagicLink', () => {
  const codePlaceholder = '##code##';
  const baseUri = 'https://example.com/sign-in/';
  const uri = testSignedMagicLink.generateRedirectUri(
    baseUri + codePlaceholder
  );
  void describe('generateRedirectUri', () => {
    void it('creates a redirectUri from the given magic link', async () => {
      const expectedRedirectUri =
        'https://example.com/sign-in/eyJ1c2VybmFtZSI6InVzZXIxIiwiaWF0IjoxNzAwMjQ1Mzk4LCJleHAiOjE3MDAyNDU0NTh9.j_oYM2muCB4aWp9f5W2Vaz-N9av1KaEuoQigQ_SOBR5AfkOU9jMg1ghhTwgC49EHLl2INnwfLp2WdWrWfi_9UbBKDUZNAUgGtFyMfr0htTFUWRKdro2LIgwqVVJErGVGQPDpZPuO-PC3BPDVL_glU6BUSecuW5iPYKPI0ERmdwI0PunW6zMBlNeLm8Qdif4vNx6_iIS7ETmbAvtOwkT3M6JoLhcmPZSmgroe2ekLj_GmPWn-a3k3pFDu2faLJ-9fKMwgKmEQ0zajb_cbHc8-8ovmhidRqXzhQ4nPs5r33nNb_Vf-_AT7cnajsh-Pb0IsAvwPaC9vExHnhz2fG5AEJA';
      strictEqual(uri, expectedRedirectUri);
    });
  });
  void describe('fromLinkFragment', () => {
    void it('creates a new SignedMagicLink with the correct info', async () => {
      const fragment = uri.slice(baseUri.length);
      const { userPoolId, username, exp, iat } = testSignedMagicLink;
      const magicLink = SignedMagicLink.fromLinkFragment(fragment, userPoolId);

      strictEqual(username, magicLink.username);
      strictEqual(exp, magicLink.exp);
      strictEqual(iat, magicLink.iat);
    });
  });
});

import { describe, it } from 'node:test';
import { PasswordlessConfig } from './passwordless_config.js';
import { deepEqual, strictEqual } from 'node:assert';

void describe('PasswordlessConfig', () => {
  void describe('otpConfig', () => {
    void it('should generate a otpLength when no length is provided', () => {
      const expectedLength = 6;

      const { otpConfig } = new PasswordlessConfig({ optsLength: undefined });

      strictEqual(otpConfig.otpLength, expectedLength);
    });

    void it('should generate a minimum OTP code length of 6', async () => {
      const otpLength = '3';
      const expectedLength = 6;

      const { otpConfig } = new PasswordlessConfig({ otpLength });

      strictEqual(otpConfig.otpLength, expectedLength);
    });

    void it('should allow overriding the OTP length', async () => {
      const otpLength = '10';
      const expectedLength = 10;

      const { otpConfig } = new PasswordlessConfig({ otpLength });

      strictEqual(otpConfig.otpLength, expectedLength);
    });
  });
  void describe('snsConfig', () => {
    void it('should extract config', async () => {
      const env = { originationNumber: '1234567890', senderId: '123456' };

      const { snsConfig } = new PasswordlessConfig(env);

      deepEqual(snsConfig, env);
    });

    void it('should extract nothing when env is empty', async () => {
      const env = { originationNumber: '', senderId: '' };

      const { snsConfig } = new PasswordlessConfig(env);

      deepEqual(snsConfig, env);
    });
  });
  void describe('sesConfig', () => {
    void it('should extract config', async () => {
      const env = { fromAddress: 'foo@bar.com', emailSubject: 'foo' };

      const { sesConfig } = new PasswordlessConfig(env);

      deepEqual(sesConfig, env);
    });

    void it('should extract nothing when env is empty', async () => {
      const env = { fromAddress: '', emailSubject: '' };
      const expected = {
        fromAddress: '',
        emailSubject: 'Your verification code',
      };

      const { sesConfig } = new PasswordlessConfig(env);

      deepEqual(sesConfig, expected);
    });
  });
});

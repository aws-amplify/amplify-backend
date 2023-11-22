import { describe, it } from 'node:test';
import { PasswordlessConfig } from './passwordless_config.js';
import { equal, strictEqual } from 'node:assert';
import { Duration } from 'aws-cdk-lib';

void describe('PasswordlessConfig', () => {
  void describe('otpConfig', () => {
    void it('should generate a otpLength when no length is provided', () => {
      const expectedLength = 6;

      const { otpConfig } = new PasswordlessConfig({ optLength: undefined });

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
  void describe('magicLinkConfig', () => {
    void it('should generate a expiry of 15 minutes when none is provided', () => {
      const { magicLinkConfig } = new PasswordlessConfig({
        magicLinkSecondsUntilExpiry: '',
      });

      equal(
        magicLinkConfig.linkDuration.toSeconds(),
        Duration.minutes(15).toSeconds()
      );
    });

    void it('should generate a expiry of 1 hour when expiry is longer than 1 hour', () => {
      const { magicLinkConfig } = new PasswordlessConfig({
        magicLinkSecondsUntilExpiry: Duration.hours(2).toSeconds().toString(),
      });

      equal(
        magicLinkConfig.linkDuration.toSeconds(),
        Duration.hours(1).toSeconds()
      );
    });

    void it('should use the provided expiry if it is less than 1 hour', () => {
      const { magicLinkConfig } = new PasswordlessConfig({
        magicLinkSecondsUntilExpiry: '60',
      });

      equal(
        magicLinkConfig.linkDuration.toSeconds(),
        Duration.minutes(1).toSeconds()
      );
    });
  });
  void describe('snsConfig', () => {
    void it('should extract config', async () => {
      const env = { otpOriginationNumber: '1234567890', otpSenderId: '123456' };

      const { snsConfig } = new PasswordlessConfig(env);

      equal(snsConfig.otp.originationNumber, env.otpOriginationNumber);
      equal(snsConfig.otp.senderId, env.otpSenderId);
    });

    void it('should extract nothing when env is empty', async () => {
      const env = { otpOriginationNumber: undefined, otpSenderId: undefined };

      const { snsConfig } = new PasswordlessConfig(env);

      equal(snsConfig.otp.originationNumber, undefined);
      equal(snsConfig.otp.senderId, undefined);
    });
  });
  void describe('sesConfig', () => {
    void it('should extract config', async () => {
      const env = { otpFromAddress: 'foo@bar.com', otpSubject: 'foo' };

      const { sesConfig } = new PasswordlessConfig(env);

      equal(sesConfig.otp.fromAddress, env.otpFromAddress);
      equal(sesConfig.otp.subject, env.otpSubject);
    });

    void it('should extract nothing when env is empty', async () => {
      const env = { otpFromAddress: undefined, otpSubject: undefined };

      const { sesConfig } = new PasswordlessConfig(env);

      equal(sesConfig.otp.subject, 'Your verification code');
      equal(sesConfig.otp.fromAddress, undefined);
    });
  });
});

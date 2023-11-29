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
      const env = {
        otpSmsEnabled: 'true',
        otpOriginationNumber: '1234567890',
        otpSenderId: '123456',
      };
      const { snsConfig } = new PasswordlessConfig(env);
      equal(snsConfig.otp?.originationNumber, env.otpOriginationNumber);
      equal(snsConfig.otp?.senderId, env.otpSenderId);
    });

    void it('should extract nothing when otp via SMS is disabled', async () => {
      const env = { otpSmsEnabled: 'false' };
      const { snsConfig } = new PasswordlessConfig(env);
      equal(snsConfig.otp, undefined);
    });

    void it('should extract nothing when env is empty', async () => {
      const env = {
        otpSmsEnabled: undefined,
        otpOriginationNumber: undefined,
        otpSenderId: undefined,
      };
      const { snsConfig } = new PasswordlessConfig(env);
      equal(snsConfig.otp, undefined);
    });
  });

  void describe('sesConfig', () => {
    void describe('OTP', () => {
      void it('should extract config', async () => {
        const env = {
          otpEmailEnabled: 'true',
          otpFromAddress: 'foo@bar.com',
          otpSubject: 'foo',
        };
        const { sesConfig } = new PasswordlessConfig(env);
        equal(sesConfig.otp?.fromAddress, env.otpFromAddress);
        equal(sesConfig.otp?.subject, env.otpSubject);
      });

      void it('should extract nothing when OTP via email is disabled', async () => {
        const env = {
          otpEmailEnabled: 'false',
          otpFromAddress: 'foo@bar.com',
          otpSubject: 'foo',
        };
        const { sesConfig } = new PasswordlessConfig(env);
        equal(sesConfig.otp, undefined);
      });

      void it('should extract nothing when env is empty', async () => {
        const env = {
          otpEmailEnabled: undefined,
          otpFromAddress: undefined,
          otpSubject: undefined,
        };
        const { sesConfig } = new PasswordlessConfig(env);
        equal(sesConfig.otp, undefined);
      });
    });
  });

  void describe('Magic Link', () => {
    void it('should extract config', async () => {
      const env = {
        magicLinkEmailEnabled: 'true',
        magicLinkFromAddress: 'foo@bar.com',
        magicLinkSubject: 'foo',
      };
      const { sesConfig } = new PasswordlessConfig(env);
      equal(sesConfig.magicLink?.fromAddress, env.magicLinkFromAddress);
      equal(sesConfig.magicLink?.subject, env.magicLinkSubject);
    });

    void it('should extract nothing when OTP via email is disabled', async () => {
      const env = {
        magicLinkEmailEnabled: 'false',
        magicLinkFromAddress: 'foo@bar.com',
        magicLinkSubject: 'foo',
      };
      const { sesConfig } = new PasswordlessConfig(env);
      equal(sesConfig.magicLink, undefined);
    });

    void it('should extract nothing when env is empty', async () => {
      const env = {
        magicLinkEmailEnabled: undefined,
        magicLinkFromAddress: undefined,
        magicLinkSubject: undefined,
      };
      const { sesConfig } = new PasswordlessConfig(env);
      equal(sesConfig.magicLink, undefined);
    });
  });
});

import { describe, it } from 'node:test';
import { rejects, strictEqual } from 'node:assert';
import { ChallengeService } from '../types.js';
import { ChallengeServiceFactory } from './challenge_service_factory.js';

void describe('ChallengeServiceFactory', () => {
  void it('getService returns the correct service', () => {
    const otpChallengeService: ChallengeService = {
      signInMethod: 'OTP',
      maxAttempts: 1,
      createChallenge: async (_, __, event) => event,
      verifyChallenge: async (event) => event,
    };
    const magicLinkChallengeService: ChallengeService = {
      signInMethod: 'MAGIC_LINK',
      maxAttempts: 1,
      createChallenge: async (_, __, event) => event,
      verifyChallenge: async (event) => event,
    };
    const factory = new ChallengeServiceFactory([
      otpChallengeService,
      magicLinkChallengeService,
    ]);
    strictEqual(factory.getService('OTP'), otpChallengeService);
    strictEqual(factory.getService('MAGIC_LINK'), magicLinkChallengeService);
  });
  void it('getService throws an error if no service is found', async () => {
    const factory = new ChallengeServiceFactory([]);
    await rejects(
      async () => factory.getService('OTP'),
      Error('No ChallengeService found for: OTP')
    );
  });
});

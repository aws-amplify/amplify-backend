import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';
import { ChallengeService } from '../types.js';
import { ChallengeServiceFactory } from './challenge_service_factory.js';

void describe('ChallengeServiceFactory', () => {
  void it('getService returns the correct service', () => {
    const otpChallengeService: ChallengeService = {
      signInMethod: 'OTP',
      createChallenge: async (event) => event,
      verifyChallenge: async (event) => event,
    };
    const magicLinkChallengeService: ChallengeService = {
      signInMethod: 'MAGIC_LINK',
      createChallenge: async (event) => event,
      verifyChallenge: async (event) => event,
    };
    const factory = new ChallengeServiceFactory([
      otpChallengeService,
      magicLinkChallengeService,
    ]);
    strictEqual(factory.getService('OTP'), otpChallengeService);
    strictEqual(factory.getService('MAGIC_LINK'), magicLinkChallengeService);
  });
});

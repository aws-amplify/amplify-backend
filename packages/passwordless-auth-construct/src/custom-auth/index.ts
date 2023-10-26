import { MagicLinkChallengeService } from '../magic-link/magic_link_challenge_service.js';
import { ChallengeServiceFactory } from '../models/challenge_service_factory.js';
import { OtpChallengeService } from '../otp/otp_challenge_service.js';
import { CustomAuthService } from './custom_auth_service.js';

const challengeServiceFactory = new ChallengeServiceFactory([
  new OtpChallengeService(),
  new MagicLinkChallengeService(),
]);

export const { defineAuthChallenge, createAuthChallenge, verifyAuthChallenge } =
  new CustomAuthService(challengeServiceFactory);

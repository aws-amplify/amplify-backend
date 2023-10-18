import { CustomAuthService } from './custom_auth_service.js';

export const { defineAuthChallenge, createAuthChallenge, verifyAuthChallenge } =
  new CustomAuthService();

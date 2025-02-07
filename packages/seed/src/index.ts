import { getSecret, setSecret } from './secrets-seed/seed_secret.js';
import {
  addToUserGroup,
  createAndSignUpUser,
  signInUser,
} from './auth-seed/auth_api_factory.js';
import {
  AuthOutputs,
  AuthSignUp,
  AuthUser,
  ChallengeResponse,
} from './types.js';

export {
  addToUserGroup,
  createAndSignUpUser,
  getSecret,
  setSecret,
  signInUser,
  AuthOutputs,
  AuthSignUp,
  AuthUser,
  ChallengeResponse,
};

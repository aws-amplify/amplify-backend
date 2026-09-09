import { getSecret, setSecret } from './secrets-seed/seed_secret.js';
import {
  addToUserGroup,
  createAndSignUpUser,
  signInUser,
} from './auth-seed/auth_api.js';
import {
  AuthOutputs,
  AuthSignUp,
  AuthUser,
  AuthUserGroupInput,
  ChallengeResponse,
  MfaSignInFlow,
  MfaSignUpFlow,
  MfaWithTotpSignUpFlow,
  PasswordSignInFlow,
  StandardUserAttributes,
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
  AuthUserGroupInput,
  ChallengeResponse,
  PasswordSignInFlow,
  MfaSignInFlow,
  MfaSignUpFlow,
  MfaWithTotpSignUpFlow,
  StandardUserAttributes,
};

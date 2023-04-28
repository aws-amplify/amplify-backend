import { Auth } from '../../aws_amplify_backend/auth_types.js';

export const auth = Auth({
  loginMechanisms: ['username'],
});

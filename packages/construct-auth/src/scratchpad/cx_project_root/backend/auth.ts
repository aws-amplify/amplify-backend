import { Auth } from '../../aws_amplify_backend/auth_types.js';
import { Fn } from '../../aws_amplify_backend/function_types.js';
import { FileStorage } from '../../aws_amplify_backend/storage_types.js';

const fn = Fn(() => {});
const storage = FileStorage({});

export const auth = Auth({
  loginMechanisms: ['username'],
  events: {
    preSignUp: fn,
  },
});

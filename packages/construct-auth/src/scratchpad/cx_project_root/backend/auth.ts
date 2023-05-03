import { Auth, AuthResources } from '../../aws_amplify_backend/auth_types.js';
import { Fn } from '../../aws_amplify_backend/function_types.js';
import { FileStorage } from '../../aws_amplify_backend/storage_types.js';
//
// const fn = new Fn(() => {});

const auth = new Auth({
  loginMechanisms: ['username'],
});

// export const auth = new Auth({
//   loginMechanisms: ['username'],
//   events: {
//     preSignUp: fn,
//   },
//   access: {
//     users: [{ allow: auth1.unauthenticatedUser, actions: ['create'] }],
//   },
// })

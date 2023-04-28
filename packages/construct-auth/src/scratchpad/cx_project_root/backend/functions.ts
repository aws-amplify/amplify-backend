import { Fn } from '../../aws_amplify_backend/function_types.js';

export const preSignUpHandler = Fn((event) => {
  console.log('this turns into a lambda');
  console.log('doing pre sign up stuff');
});

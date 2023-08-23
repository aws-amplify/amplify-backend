import { Auth } from '@aws-amplify/backend-auth';
import { secret } from '@aws-amplify/backend';
export const auth = new Auth({
  loginMechanisms: [
    'email',
    {
      provider: 'google',
      webClientId: 'demoClientId',
      webClientSecret: secret('demoWebClientSecret'),
    },
  ],
  selfSignUpEnabled: true,
});

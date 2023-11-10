import { defineAuth } from '@aws-amplify/backend';

/** @see https://docs.amplify.aws/gen2/build-a-backend/auth */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});

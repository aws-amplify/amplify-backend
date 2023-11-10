import { defineAuth } from '@aws-amplify/backend'

/** @see https://docs.amplify.aws/gen2/build-a-backend/auth */
export const auth = defineAuth({
  loginWith: {
    email: true,
    // externalProviders: {
    //   loginWithAmazon: {
    //     clientId: secret('LOGINWITHAMAZON_CLIENT_ID'),
    //     clientSecret: secret('LOGINWITHAMAZON_CLIENT_SECRET'),
    //   },
    //   callbackUrls: ['http://localhost:3000/welcome'],
    //   logoutUrls: ['http://localhost:3000/come-back-soon'],
    // },
  },
  // multifactor: {
  //   mode: 'OPTIONAL',
  //   totp: true,
  // }
})

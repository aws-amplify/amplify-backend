import { defineAuth } from '@aws-amplify/backend';
import { funcCustomEmailSender } from '../function.js';

const customEmailSenderFunction = {
  handler: funcCustomEmailSender,
};

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  senders: {
    email: customEmailSenderFunction,
  },
});

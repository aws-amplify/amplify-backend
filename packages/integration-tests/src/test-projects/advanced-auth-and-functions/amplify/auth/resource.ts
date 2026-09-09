import { defineAuth } from '@aws-amplify/backend';
import { funcCustomEmailSender, funcCustomSmsSender } from '../function.js';

const customEmailSenderFunction = {
  handler: funcCustomEmailSender,
};

const customSmsSenderFunction = {
  handler: funcCustomSmsSender,
};

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  multifactor: {
    sms: true,
    mode: 'REQUIRED',
  },
  senders: {
    email: customEmailSenderFunction,
    sms: customSmsSenderFunction,
  },
});

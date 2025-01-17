import {
  funcCustomEmailSender,
  funcCustomSmsSender,
  funcNoMinify,
  funcProvided,
  funcWithAwsSdk,
  funcWithSchedule,
  funcWithSsm,
} from './function.js';
import { auth } from './auth/resource.js';

export const authAndFunctions = {
  auth,
  funcWithSsm,
  funcWithAwsSdk,
  funcWithSchedule,
  funcNoMinify,
  funcCustomEmailSender,
  funcCustomSmsSender,
  funcProvided,
};

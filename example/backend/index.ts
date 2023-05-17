import { auth } from './auth';
import { data } from './data';
import { storage } from './storage';

export const backend = {
  ...auth,
  ...storage,
  ...data,
};

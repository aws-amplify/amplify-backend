import { data } from './data/resource.js';
import { defaultNodeFunc, node16Func } from './function.js';
import { storage } from './storage/resource.js';
import { auth } from './auth/resource.js';

export const dataStorageAuthWithTriggers = {
  auth,
  storage,
  defaultNodeFunc,
  data,
  node16Func,
};

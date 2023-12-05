import { data } from './data/resource.js';
import { myFunc } from './function.js';
import { storage } from './storage/resource.js';
import { auth } from './auth/resource.js';

export const dataStorageAuthWithTriggers = { auth, storage, myFunc, data };

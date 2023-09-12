import { Backend } from '@aws-amplify/backend';
import { auth } from './auth.js';

new Backend({ auth });

import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource.js';

defineBackend({ data });

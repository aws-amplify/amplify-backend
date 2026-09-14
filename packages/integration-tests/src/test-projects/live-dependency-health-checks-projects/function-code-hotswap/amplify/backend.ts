import { defineBackend } from '@aws-amplify/backend';
import { nodeFunc } from './function.js';

defineBackend({ nodeFunc });

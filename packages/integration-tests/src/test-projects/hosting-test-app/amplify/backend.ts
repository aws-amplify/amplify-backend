import { defineBackend } from '@aws-amplify/backend';
import { dataAuth } from './test_factories.js';

defineBackend(dataAuth);

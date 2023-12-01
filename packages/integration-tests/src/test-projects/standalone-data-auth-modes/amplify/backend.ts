import { defineBackend } from '@aws-amplify/backend';
import { dataWithoutAuth } from './test_factories.js';

defineBackend(dataWithoutAuth);

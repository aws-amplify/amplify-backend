import { defineBackend } from '@aws-amplify/backend';
import { dataStorageAuthWithTriggers } from './test_factories.js';

defineBackend(dataStorageAuthWithTriggers);

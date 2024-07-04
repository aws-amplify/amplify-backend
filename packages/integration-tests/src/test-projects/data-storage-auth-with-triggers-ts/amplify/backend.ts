import { defineBackend } from '@aws-amplify/backend';
import { dataStorageAuthWithTriggers } from './test_factories.js';

const backend = defineBackend(dataStorageAuthWithTriggers);
backend.defaultNodeFunc.addEnvironment('newKey', 'newValue');

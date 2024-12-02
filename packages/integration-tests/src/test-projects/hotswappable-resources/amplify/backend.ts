import { defineBackend } from '@aws-amplify/backend';
import { hotswappableResources } from './test_factories.js';

defineBackend(hotswappableResources);

import { defineBackend } from '@aws-amplify/backend';
import { dataComplexSchema } from './test_factories.js';

defineBackend(dataComplexSchema);

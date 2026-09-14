import { defineBackend } from '@aws-amplify/backend';
import { dataStorageAuthWithTriggers } from './test_factories.js';

const backend = defineBackend(dataStorageAuthWithTriggers);
backend.defaultNodeFunc.addEnvironment('newKey', 'newValue');

// Change precedence of Editors group so Admins group has the lowest precedence
backend.auth.resources.groups['Editors'].cfnUserGroup.precedence = 2;

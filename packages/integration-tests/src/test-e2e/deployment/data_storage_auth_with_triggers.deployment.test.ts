import { DataStorageAuthWithTriggerTestProjectCreator } from '../../test-project-setup/data_storage_auth_with_triggers.js';
import { defineDeploymentTest } from './deployment.test.template.js';

defineDeploymentTest(new DataStorageAuthWithTriggerTestProjectCreator());

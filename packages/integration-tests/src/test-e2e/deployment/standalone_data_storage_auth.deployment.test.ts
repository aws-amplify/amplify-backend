import { DataStorageAuthWithTriggerTestProjectCreator } from '../../test-project-setup/data_storage_auth_with_triggers.js';
import { defineStandaloneDeploymentTest } from './standalone_deployment.test.template.js';

defineStandaloneDeploymentTest(
  new DataStorageAuthWithTriggerTestProjectCreator(),
);

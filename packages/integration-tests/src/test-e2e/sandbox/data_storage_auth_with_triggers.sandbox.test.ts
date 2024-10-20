import { defineSandboxTest } from './sandbox.test.template.js';
import { DataStorageAuthWithTriggerTestProjectCreator } from '../../test-project-setup/data_storage_auth_with_triggers.js';

defineSandboxTest(new DataStorageAuthWithTriggerTestProjectCreator());

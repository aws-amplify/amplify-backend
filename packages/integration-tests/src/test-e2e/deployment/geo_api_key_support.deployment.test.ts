import { defineDeploymentTest } from './deployment.test.template.js';
import { GeoAPIKeySupportTestProjectCreator } from '../../test-project-setup/geo_api_support_testing.js';

defineDeploymentTest(new GeoAPIKeySupportTestProjectCreator());

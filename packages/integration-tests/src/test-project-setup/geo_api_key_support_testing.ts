import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  ListGeofenceCollectionsCommand,
  ListKeysCommand,
  Location,
  LocationClient,
} from '@aws-sdk/client-location';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import assert from 'node:assert';

/**
 * Creates test project for testing new Geo backend functionality with API key support.
 */
export class GeoAPIKeySupportTestProjectCreator implements TestProjectCreator {
  readonly name = 'geo-api-key-support';

  /**
   * Initializes project creator object
   */
  constructor(
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig,
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig,
    ),
    private readonly locationClient: LocationClient = new Location(
      e2eToolingClientConfig,
    ),
    private readonly resourceFinder: DeployedResourcesFinder = new DeployedResourcesFinder(),
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new GeoAPIKeySupportTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
      this.locationClient,
      this.resourceFinder,
    );

    await fs.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      { recursive: true },
    );

    return project;
  };
}

/**
 * Creates project with geo and auth resources initialized
 */
export class GeoAPIKeySupportTestProject extends TestProjectBase {
  readonly sourceProjectDirPath = '../../src/test-projects/geo-api-key-support';
  readonly sourceProjectAmplifyDirURL = new URL(
    `${this.sourceProjectDirPath}/amplify`,
    import.meta.url,
  );

  /**
   * Creates an instance of a test project with Geofence Collections and API keys provisioned
   */
  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    amplifyClient: AmplifyClient,
    private readonly locationClient: LocationClient,
    private readonly resourceFinder: DeployedResourcesFinder,
  ) {
    super(
      name,
      projectDirPath,
      projectAmplifyDirPath,
      cfnClient,
      amplifyClient,
    );
  }

  /**
   * Override implementation of post deployment assertions specific to Amplify Geo tests
   */
  override async assertPostDeployment(
    backendId: BackendIdentifier,
  ): Promise<void> {
    await super.assertPostDeployment(backendId); // perform regular post-deployment tests

    const testCollection = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::Location::GeofenceCollection',
      (name) => name.includes('integrationTestCollection'),
    );

    const testAPIKey = await this.resourceFinder.findByBackendIdentifier(
      backendId,
      'AWS::Location::APIKey',
      (name) => name.includes('integrationTestIndexKey'),
    );

    assert.equal(testCollection.length, 1);
    assert.equal(testAPIKey.length, 1);

    const expectedCollectionResponse = {
      Entries: [
        {
          CollectionName: 'integrationTestCollection',
          Description:
            'This is a geofence collection setup for integration testing purposes.',
          CreateTime: new Date(),
          UpdateTime: new Date(),
        },
      ],
    };

    const collectionResponse = await this.locationClient.send(
      new ListGeofenceCollectionsCommand(),
    );

    const hasCollection = collectionResponse.Entries?.some(
      (entry) =>
        entry.CollectionName ===
          expectedCollectionResponse.Entries[0].CollectionName &&
        entry.Description === expectedCollectionResponse.Entries[0].Description,
    );

    assert.ok(
      hasCollection,
      'Expected collection not found in client response.',
    );

    const expectedKeysResponse = {
      Entries: {
        KeyName: 'integrationTestIndexKey',
        CreateTime: new Date(),
        UpdateTime: new Date(),
        Restrictions: {
          AllowActions: ['geo-places:Autocomplete'],
        },
      },
    };

    const keyResponse = await this.locationClient.send(new ListKeysCommand());

    const hasKey = keyResponse.Entries?.some(
      (entry) =>
        entry.KeyName === expectedKeysResponse.Entries.KeyName &&
        JSON.stringify(entry.Restrictions?.AllowActions) ===
          JSON.stringify(
            expectedKeysResponse.Entries.Restrictions.AllowActions,
          ),
    );

    assert.ok(hasKey, 'Expected key not found in client response.');
  }

  private verifyCollectionResponse = async (expectedResponse: unknown) => {
    const locationResponse = await this.locationClient.send(
      new ListGeofenceCollectionsCommand(),
    );
    assert.equal(locationResponse, expectedResponse);
  };
}

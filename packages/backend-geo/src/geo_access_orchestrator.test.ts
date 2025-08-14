import { beforeEach, describe, it, mock } from 'node:test';
import { GeoAccessOrchestratorFactory } from './geo_access_orchestrator.js';
import {
  ConstructFactoryGetInstanceProps,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import { App, Stack } from 'aws-cdk-lib';
import assert from 'node:assert';
import { AmplifyUserError } from '@aws-amplify/platform-core';

void describe('GeoAccessOrchestrator', () => {
  void describe('orchestrateGeoAccess', () => {
    let stack: Stack;

    const ssmEnvironmentEntriesStub: SsmEnvironmentEntry[] = [];

    const testResourceArn =
      'arn:aws:geo:us-east-1:123456789012:geofence-collection/test-collection';

    const testResourceName = 'testResource';

    beforeEach(() => {
      stack = createStackAndSetContext();
    });

    void it('throws if invalid actions are provided for resource type', () => {
      const acceptResourceAccessMock = mock.fn();
      const geoAccessOrchestrator =
        new GeoAccessOrchestratorFactory().getInstance(
          () => [
            {
              actions: ['invalidAction'], // Invalid action for collection
              getAccessAcceptors: [
                () => ({
                  identifier: 'testAcceptor',
                  acceptResourceAccess: acceptResourceAccessMock,
                }),
              ],
              uniqueDefinitionValidators: [
                {
                  uniqueRoleToken: 'authenticated',
                  validationErrorOptions: {
                    message: 'Test error',
                    resolution: 'Test resolution',
                  },
                },
              ],
            },
          ],
          {} as unknown as ConstructFactoryGetInstanceProps,
          stack,
          ssmEnvironmentEntriesStub,
        );

      assert.throws(
        () =>
          geoAccessOrchestrator.orchestrateGeoAccess(
            testResourceArn,
            'collection',
            testResourceName,
          ),
        new AmplifyUserError('ActionNotFoundError', {
          message:
            'Desired access action not found for the specific collection resource.',
          resolution:
            'Please refer to specific collection access actions for more information.',
        }),
      );
    });

    void it('throws if duplicate role tokens are provided', () => {
      const acceptResourceAccessMock = mock.fn();
      const geoAccessOrchestrator =
        new GeoAccessOrchestratorFactory().getInstance(
          () => [
            {
              actions: ['read'],
              getAccessAcceptors: [
                () => ({
                  identifier: 'testAcceptor',
                  acceptResourceAccess: acceptResourceAccessMock,
                }),
              ],
              uniqueDefinitionValidators: [
                {
                  uniqueRoleToken: 'authenticated',
                  validationErrorOptions: {
                    message: 'Duplicate authenticated access definition',
                    resolution: 'Combine access definitions',
                  },
                },
                {
                  uniqueRoleToken: 'authenticated',
                  validationErrorOptions: {
                    message: 'Duplicate authenticated access definition',
                    resolution: 'Combine access definitions',
                  },
                },
              ],
            },
          ],
          {} as unknown as ConstructFactoryGetInstanceProps,
          stack,
          ssmEnvironmentEntriesStub,
        );

      assert.throws(
        () =>
          geoAccessOrchestrator.orchestrateGeoAccess(
            testResourceArn,
            'collection',
            testResourceName,
          ),
        new AmplifyUserError('InvalidGeoAccessDefinitionError', {
          message: 'Duplicate authenticated access definition',
          resolution: 'Combine access definitions',
        }),
      );
    });

    void it('handles multiple actions for single access definition', () => {
      const acceptResourceAccessMock = mock.fn();

      const geoAccessOrchestrator =
        new GeoAccessOrchestratorFactory().getInstance(
          () => [
            {
              actions: ['read', 'create', 'update'],
              getAccessAcceptors: [
                () => ({
                  identifier: 'authenticatedUserIamRole',
                  acceptResourceAccess: acceptResourceAccessMock,
                }),
              ],
              uniqueDefinitionValidators: [
                {
                  uniqueRoleToken: 'authenticated',
                  validationErrorOptions: {
                    message: 'Test error',
                    resolution: 'Test resolution',
                  },
                },
              ],
            },
          ],
          {} as unknown as ConstructFactoryGetInstanceProps,
          stack,
          ssmEnvironmentEntriesStub,
        );

      const policies = geoAccessOrchestrator.orchestrateGeoAccess(
        testResourceArn,
        'collection',
        testResourceName,
      );
      assert.equal(acceptResourceAccessMock.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: [
                'geo:DescribeGeofenceCollection',
                'geo:BatchEvaluateGeofences',
                'geo:ForecastGeofenceEvents',
                'geo:GetGeofence',
                'geo:CreateGeofenceCollection',
                'geo:BatchPutGeofence',
                'geo:PutGeofence',
                'geo:UpdateGeofenceCollection',
              ],
              Effect: 'Allow',
              Resource: testResourceArn,
            },
          ],
          Version: '2012-10-17',
        },
      );

      assert.equal(policies.length, 1);
    });

    void it('handles multiple access acceptors for single definition', () => {
      const acceptResourceAccessMock1 = mock.fn();
      const acceptResourceAccessMock2 = mock.fn();

      const geoAccessOrchestrator =
        new GeoAccessOrchestratorFactory().getInstance(
          () => [
            {
              actions: ['read'],
              getAccessAcceptors: [
                () => ({
                  identifier: 'group-admin',
                  acceptResourceAccess: acceptResourceAccessMock1,
                }),
                () => ({
                  identifier: 'group-user',
                  acceptResourceAccess: acceptResourceAccessMock2,
                }),
              ],
              uniqueDefinitionValidators: [
                {
                  uniqueRoleToken: 'group-admin',
                  validationErrorOptions: {
                    message: 'Test error',
                    resolution: 'Test resolution',
                  },
                },
                {
                  uniqueRoleToken: 'group-user',
                  validationErrorOptions: {
                    message: 'Test error',
                    resolution: 'Test resolution',
                  },
                },
              ],
            },
          ],
          {} as unknown as ConstructFactoryGetInstanceProps,
          stack,
          ssmEnvironmentEntriesStub,
        );

      geoAccessOrchestrator.orchestrateGeoAccess(
        testResourceArn,
        'collection',
        testResourceName,
      );

      assert.equal(acceptResourceAccessMock1.mock.callCount(), 1);
      assert.equal(acceptResourceAccessMock2.mock.callCount(), 1);

      assert.deepStrictEqual(
        acceptResourceAccessMock1.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: [
                'geo:DescribeGeofenceCollection',
                'geo:BatchEvaluateGeofences',
                'geo:ForecastGeofenceEvents',
                'geo:GetGeofence',
              ],
              Effect: 'Allow',
              Resource: testResourceArn,
            },
          ],
          Version: '2012-10-17',
        },
      );

      assert.deepStrictEqual(
        acceptResourceAccessMock2.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: [
                'geo:DescribeGeofenceCollection',
                'geo:BatchEvaluateGeofences',
                'geo:ForecastGeofenceEvents',
                'geo:GetGeofence',
              ],
              Effect: 'Allow',
              Resource: testResourceArn,
            },
          ],
          Version: '2012-10-17',
        },
      );
    });

    void it('handles multiple access definitions', () => {
      const acceptResourceAccessMock1 = mock.fn();
      const acceptResourceAccessMock2 = mock.fn();

      const geoAccessOrchestrator =
        new GeoAccessOrchestratorFactory().getInstance(
          () => [
            {
              actions: ['read'],
              getAccessAcceptors: [
                () => ({
                  identifier: 'authenticatedUserIamRole',
                  acceptResourceAccess: acceptResourceAccessMock1,
                }),
              ],
              uniqueDefinitionValidators: [
                {
                  uniqueRoleToken: 'authenticated',
                  validationErrorOptions: {
                    message: 'Test error',
                    resolution: 'Test resolution',
                  },
                },
              ],
            },
            {
              actions: ['create', 'update'],
              getAccessAcceptors: [
                () => ({
                  identifier: 'group-admin',
                  acceptResourceAccess: acceptResourceAccessMock2,
                }),
              ],
              uniqueDefinitionValidators: [
                {
                  uniqueRoleToken: 'group-admin',
                  validationErrorOptions: {
                    message: 'Test error',
                    resolution: 'Test resolution',
                  },
                },
              ],
            },
          ],
          {} as unknown as ConstructFactoryGetInstanceProps,
          stack,
          ssmEnvironmentEntriesStub,
        );

      geoAccessOrchestrator.orchestrateGeoAccess(
        testResourceArn,
        'collection',
        testResourceName,
      );

      assert.equal(acceptResourceAccessMock1.mock.callCount(), 1);
      assert.equal(acceptResourceAccessMock2.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock1.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: [
                'geo:DescribeGeofenceCollection',
                'geo:BatchEvaluateGeofences',
                'geo:ForecastGeofenceEvents',
                'geo:GetGeofence',
              ],
              Effect: 'Allow',
              Resource: testResourceArn,
            },
          ],
          Version: '2012-10-17',
        },
      );

      assert.deepStrictEqual(
        acceptResourceAccessMock2.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: [
                'geo:CreateGeofenceCollection',
                'geo:BatchPutGeofence',
                'geo:PutGeofence',
                'geo:UpdateGeofenceCollection',
              ],
              Effect: 'Allow',
              Resource: testResourceArn,
            },
          ],
          Version: '2012-10-17',
        },
      );
    });

    void it('validates actions for map resource type', () => {
      const acceptResourceAccessMock = mock.fn();
      const geoAccessOrchestrator =
        new GeoAccessOrchestratorFactory().getInstance(
          () => [
            {
              actions: ['get'],
              getAccessAcceptors: [
                () => ({
                  identifier: 'authenticatedUserIamRole',
                  acceptResourceAccess: acceptResourceAccessMock,
                }),
              ],
              uniqueDefinitionValidators: [
                {
                  uniqueRoleToken: 'authenticated',
                  validationErrorOptions: {
                    message: 'Test error',
                    resolution: 'Test resolution',
                  },
                },
              ],
            },
          ],
          {} as unknown as ConstructFactoryGetInstanceProps,
          stack,
          ssmEnvironmentEntriesStub,
        );

      // Should not throw for valid map action
      geoAccessOrchestrator.orchestrateGeoAccess(
        'arn:aws:geo-maps:us-east-1::provider/default',
        'map',
        testResourceName,
      );
      assert.equal(acceptResourceAccessMock.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: ['geo-maps:GetStaticMap', 'geo-maps:GetTile'],
              Effect: 'Allow',
              Resource: 'arn:aws:geo-maps:us-east-1::provider/default',
            },
          ],
          Version: '2012-10-17',
        },
      );
    });

    void it('validates actions for place resource type', () => {
      const acceptResourceAccessMock = mock.fn();
      const geoAccessOrchestrator =
        new GeoAccessOrchestratorFactory().getInstance(
          () => [
            {
              actions: ['search', 'geocode'], // Valid for place
              getAccessAcceptors: [
                () => ({
                  identifier: 'authenticatedUserIamRole',
                  acceptResourceAccess: acceptResourceAccessMock,
                }),
              ],
              uniqueDefinitionValidators: [
                {
                  uniqueRoleToken: 'authenticated',
                  validationErrorOptions: {
                    message: 'Test error',
                    resolution: 'Test resolution',
                  },
                },
              ],
            },
          ],
          {} as unknown as ConstructFactoryGetInstanceProps,
          stack,
          ssmEnvironmentEntriesStub,
        );

      // Should not throw for valid place actions
      geoAccessOrchestrator.orchestrateGeoAccess(
        'arn:aws:geo-places:us-east-1::provider/default',
        'place',
        testResourceName,
      );
      assert.equal(acceptResourceAccessMock.mock.callCount(), 1);
      assert.deepStrictEqual(
        acceptResourceAccessMock.mock.calls[0].arguments[0].document.toJSON(),
        {
          Statement: [
            {
              Action: [
                'geo-places:GetPlace',
                'geo-places:SearchNearby',
                'geo-places:SearchText',
                'geo-places:Suggest',
                'geo-places:Geocode',
                'geo-places:ReverseGeocode',
              ],
              Effect: 'Allow',
              Resource: 'arn:aws:geo-places:us-east-1::provider/default',
            },
          ],
          Version: '2012-10-17',
        },
      );
    });

    void it('throws for invalid action on map resource', () => {
      const acceptResourceAccessMock = mock.fn();
      const geoAccessOrchestrator =
        new GeoAccessOrchestratorFactory().getInstance(
          () => [
            {
              actions: ['create'], // Invalid for map (valid for collection)
              getAccessAcceptors: [
                () => ({
                  identifier: 'authenticatedUserIamRole',
                  acceptResourceAccess: acceptResourceAccessMock,
                }),
              ],
              uniqueDefinitionValidators: [
                {
                  uniqueRoleToken: 'authenticated',
                  validationErrorOptions: {
                    message: 'Test error',
                    resolution: 'Test resolution',
                  },
                },
              ],
            },
          ],
          {} as unknown as ConstructFactoryGetInstanceProps,
          stack,
          ssmEnvironmentEntriesStub,
        );

      assert.throws(
        () =>
          geoAccessOrchestrator.orchestrateGeoAccess(
            'arn:aws:geo:us-east-1:123456789012:map/test-map',
            'map',
            testResourceName,
          ),
        new AmplifyUserError('ActionNotFoundError', {
          message:
            'Desired access action not found for the specific map resource.',
          resolution:
            'Please refer to specific map access actions for more information.',
        }),
      );
    });

    void it('handles empty actions array', () => {
      const acceptResourceAccessMock = mock.fn();
      const geoAccessOrchestrator =
        new GeoAccessOrchestratorFactory().getInstance(
          () => [
            {
              actions: [],
              getAccessAcceptors: [
                () => ({
                  identifier: 'authenticatedUserIamRole',
                  acceptResourceAccess: acceptResourceAccessMock,
                }),
              ],
              uniqueDefinitionValidators: [
                {
                  uniqueRoleToken: 'authenticated',
                  validationErrorOptions: {
                    message: 'Test error',
                    resolution: 'Test resolution',
                  },
                },
              ],
            },
          ],
          {} as unknown as ConstructFactoryGetInstanceProps,
          stack,
          ssmEnvironmentEntriesStub,
        );

      assert.throws(
        () =>
          geoAccessOrchestrator.orchestrateGeoAccess(
            testResourceArn,
            'collection',
            testResourceName,
          ),
        { message: 'At least one permission must be specified' },
      );
    });
  });
});

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  const stack = new Stack(app);
  return stack;
};

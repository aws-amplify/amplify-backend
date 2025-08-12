import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { AmplifyGeoOutputsAspect } from './geo_outputs_aspect.js';
import { AmplifyCollection } from './collection_construct.js';
import { AmplifyMap } from './map_resource.js';
import { AmplifyPlace } from './place_resource.js';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { GeoOutput } from '@aws-amplify/backend-output-schemas';
import { App, Stack } from 'aws-cdk-lib';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { AllowMapsAction } from '@aws-cdk/aws-location-alpha';

void describe('AmplifyGeoOutputsAspect', () => {
  let app: App;
  let stack: Stack;
  let outputStorageStrategy: BackendOutputStorageStrategy<GeoOutput>;
  let aspect: AmplifyGeoOutputsAspect;

  const addBackendOutputEntryMock = mock.fn();
  const appendToBackendOutputListMock = mock.fn();

  beforeEach(() => {
    app = new App();
    stack = new Stack(app);

    outputStorageStrategy = {
      addBackendOutputEntry: addBackendOutputEntryMock,
      appendToBackendOutputList: appendToBackendOutputListMock,
    };
  });

  afterEach(() => {
    addBackendOutputEntryMock.mock.resetCalls();
    appendToBackendOutputListMock.mock.resetCalls();
  });

  void describe('visit', () => {
    void it('output storage invoked with AmplifyMap node', () => {
      const mapNode = new AmplifyMap(stack, 'testMap', {
        name: 'testMapResourceName',
      });
      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      aspect.visit(mapNode);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);
    });

    void it('output storage invoked with AmplifyPlace node', () => {
      const placeNode = new AmplifyPlace(stack, 'testPlace', {
        name: 'testPlaceResourceName',
      });
      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      aspect.visit(placeNode);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);
    });

    void it('output storage invoked with AmplifyCollection node', () => {
      const collectionNode = new AmplifyCollection(stack, 'testCollection', {
        name: 'testCollectionName',
      });
      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      aspect.visit(collectionNode);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);
    });

    void it('output entry called once with multiple collections created', () => {
      new AmplifyCollection(stack, 'testCollection_1', {
        name: 'testCollection1',

        isDefault: true,
      }); // set as default collection
      const collectionNode = new AmplifyCollection(stack, 'testCollection_2', {
        name: 'testCollection2',
      });

      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      aspect.visit(collectionNode);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);
    });
  });

  void describe('resource validation for outputs', () => {
    void it('throws if no collection set to default', () => {
      const noDuplicateStack = new Stack(app, 'noDuplicateStack');
      const newNode = new AmplifyCollection(
        noDuplicateStack,
        'testCollection2',
        { name: 'testCollection_2' },
      );
      new AmplifyCollection(noDuplicateStack, 'testCollection3', {
        name: 'testCollection_3',
      });
      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      assert.throws(
        () => {
          aspect.visit(newNode);
        },
        new AmplifyUserError('NoDefaultCollectionError', {
          message: `No default collection set in the Amplify project`,
          resolution: `Add 'isDefault: true' to one of the 'defineCollection' calls in your Amplify project`,
        }),
      );
    });

    void it('throws if multiple default collections', () => {
      const node = new AmplifyCollection(stack, 'testCollection', {
        name: 'defaultCollection',

        isDefault: true,
      });
      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      assert.throws(
        () => {
          new AmplifyCollection(stack, 'defaultCollection', {
            name: 'default_collection',

            isDefault: true,
          });
          aspect.visit(node);
        },
        new AmplifyUserError('MultipleDefaultCollectionError', {
          message: `More than one default collection set in the Amplify project`,
          resolution: `Remove 'isDefault: true' from all 'defineCollection' calls except for one in your Amplify project`,
        }),
      );
    });
  });

  void describe('output validation', () => {
    void it('output without collection', () => {
      const node = new AmplifyMap(stack, 'mapResource', {
        name: 'testMapResource',
      });
      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      aspect.visit(node);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);

      assert.equal(addBackendOutputEntryMock.mock.calls[0].arguments.length, 2);
      assert.equal(
        addBackendOutputEntryMock.mock.calls[0].arguments[0],
        'AWS::Amplify::Geo',
      );
      assert.equal(
        addBackendOutputEntryMock.mock.calls[0].arguments[1].payload.geoRegion,
        Stack.of(node).region,
      );
      assert.deepStrictEqual(
        addBackendOutputEntryMock.mock.calls[0].arguments[1].payload
          .geofenceCollections,
        undefined,
      );
    });

    void it('output with multiple collections and all resources', () => {
      const node = new AmplifyMap(stack, 'mapResource', {
        name: 'testMapResource',
        apiKeyProps: {
          apiKeyName: 'myKey',
        },
      });

      node.generateApiKey([AllowMapsAction.GET_STATIC_MAP]);
      new AmplifyPlace(stack, 'placeResource', { name: 'testPlaceIndex' });
      new AmplifyCollection(stack, 'defaultCollection', {
        name: 'default_collection',
        isDefault: true,
      });
      new AmplifyCollection(stack, 'testCollection', {
        name: 'testCollection',
      });

      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      aspect.visit(node);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);

      /**
        {
          version: '1',
          payload: {
            maps: JSON.stringify({
              default: "testMapResource",
              items: [{
                name: "testMapResource",
                api_key_name: "TOKEN_STRING"
              }]
            })
          }
        }
       */
      assert.equal(
        JSON.parse(
          addBackendOutputEntryMock.mock.calls[0].arguments[1].payload.maps,
        ).items[0].api_key_name,
        'myKey',
      );

      assert.equal(
        JSON.parse(
          addBackendOutputEntryMock.mock.calls[0].arguments[1].payload.maps,
        ).items[0].name,
        'testMapResource',
      );

      assert.equal(
        JSON.parse(
          addBackendOutputEntryMock.mock.calls[0].arguments[1].payload
            .searchIndices,
        ).items[0].name,
        'testPlaceIndex',
      );

      assert.equal(
        JSON.parse(
          addBackendOutputEntryMock.mock.calls[0].arguments[1].payload
            .geofenceCollections,
        ).items[0],
        'default_collection',
      );

      assert.equal(
        JSON.parse(
          addBackendOutputEntryMock.mock.calls[0].arguments[1].payload
            .geofenceCollections,
        ).items[1],
        'testCollection',
      );
    });
  });
});

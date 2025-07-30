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
      assert.equal(appendToBackendOutputListMock.mock.callCount(), 1);
    });

    void it('output storage invoked with AmplifyPlace node', () => {
      const placeNode = new AmplifyPlace(stack, 'testPlace', {
        name: 'testPlaceResourceName',
      });
      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      aspect.visit(placeNode);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);
      assert.equal(appendToBackendOutputListMock.mock.callCount(), 1);
    });

    void it('output storage invoked with AmplifyCollection node', () => {
      const collectionNode = new AmplifyCollection(stack, 'testCollection', {
        name: 'testCollectionName',
        collectionProps: {},
      });
      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      aspect.visit(collectionNode);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);
      assert.equal(appendToBackendOutputListMock.mock.callCount(), 1);
    });

    void it('output entry called once with multiple maps created', () => {
      new AmplifyMap(stack, 'testMap_1', {
        name: 'testMap1',
        isDefault: true,
      }); // set as default map
      const mapNode = new AmplifyMap(stack, 'testMap_2', {
        name: 'testMap2',
      });

      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      aspect.visit(mapNode);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);
      assert.equal(appendToBackendOutputListMock.mock.callCount(), 1);
    });

    void it('output entry called once with multiple places created', () => {
      new AmplifyPlace(stack, 'testPlace_1', {
        name: 'testPlace1',
        isDefault: true,
      }); // set as default place
      const placeNode = new AmplifyPlace(stack, 'testPlace_2', {
        name: 'testPlace2',
      });

      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      aspect.visit(placeNode);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);
      assert.equal(appendToBackendOutputListMock.mock.callCount(), 1);
    });

    void it('output entry called once with multiple collections created', () => {
      new AmplifyCollection(stack, 'testCollection_1', {
        name: 'testCollection1',
        collectionProps: {},
        isDefault: true,
      }); // set as default collection
      const collectionNode = new AmplifyCollection(stack, 'testCollection_2', {
        name: 'testCollection2',
        collectionProps: {},
      });

      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      aspect.visit(collectionNode);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);
      assert.equal(appendToBackendOutputListMock.mock.callCount(), 1);
    });
  });

  void describe('resource validation for outputs', () => {
    void it('throws if no collection set to default', () => {
      const noDuplicateStack = new Stack(app, 'noDuplicateStack');
      const newNode = new AmplifyCollection(
        noDuplicateStack,
        'testCollection2',
        { name: 'testCollection_2', collectionProps: {} },
      );
      new AmplifyCollection(noDuplicateStack, 'testCollection3', {
        name: 'testCollection_3',
        collectionProps: {},
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
        collectionProps: {},
        isDefault: true,
      });
      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      assert.throws(
        () => {
          new AmplifyCollection(stack, 'defaultCollection', {
            name: 'default_collection',
            collectionProps: {},
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

    void it('throws if no map set to default', () => {
      const noDuplicateStack = new Stack(app, 'noDuplicateStack');
      const newNode = new AmplifyMap(noDuplicateStack, 'testMap', {
        name: 'testMap',
      });
      new AmplifyMap(noDuplicateStack, 'testMap2', {
        name: 'testDuplicateMap2',
      });
      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      assert.throws(
        () => {
          aspect.visit(newNode);
        },
        new AmplifyUserError('NoDefaultMapError', {
          message: `No default map set in the Amplify project`,
          resolution: `Add 'isDefault: true' to one of the 'defineMap' calls in your Amplify project`,
        }),
      );
    });

    void it('throws if multiple default maps', () => {
      const node = new AmplifyMap(stack, 'testMapDefault', {
        name: 'defaultMap',
        isDefault: true,
      });
      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      assert.throws(
        () => {
          new AmplifyMap(stack, 'anotherDefaultMap', {
            name: 'anotherDefaultMap',
            isDefault: true,
          });
          aspect.visit(node);
        },
        new AmplifyUserError('MultipleDefaultMapError', {
          message: `More than one default map set in the Amplify project`,
          resolution: `Remove 'isDefault: true' from all 'defineMap' calls except for one in your Amplify project`,
        }),
      );
    });

    void it('throws if no place set to default', () => {
      const noDuplicateStack = new Stack(app, 'noDuplicateStack');
      const newNode = new AmplifyPlace(noDuplicateStack, 'testPlace', {
        name: 'testPlace',
      });
      new AmplifyPlace(noDuplicateStack, 'testPlace2', {
        name: 'testDuplicatePlace2',
      });
      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      assert.throws(
        () => {
          aspect.visit(newNode);
        },
        new AmplifyUserError('NoDefaultPlaceError', {
          message: `No default place set in the Amplify project`,
          resolution: `Add 'isDefault: true' to one of the 'definePlace' calls in your Amplify project`,
        }),
      );
    });

    void it('throws if multiple default places', () => {
      const node = new AmplifyPlace(stack, 'testPlaceDefault', {
        name: 'defaultPlace',
        isDefault: true,
      });
      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      assert.throws(
        () => {
          new AmplifyPlace(stack, 'anotherDefaultPlace', {
            name: 'anotherDefaultPlace',
            isDefault: true,
          });
          aspect.visit(node);
        },
        new AmplifyUserError('MultipleDefaultPlaceError', {
          message: `More than one default place set in the Amplify project`,
          resolution: `Remove 'isDefault: true' from all 'definePlace' calls except for one in your Amplify project`,
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
      assert.equal(appendToBackendOutputListMock.mock.callCount(), 1);

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
        collectionProps: { geofenceCollectionName: 'newCollection' },
        isDefault: true,
      });
      new AmplifyCollection(stack, 'testCollection', {
        name: 'default_collection',
        collectionProps: {},
      });

      aspect = new AmplifyGeoOutputsAspect(outputStorageStrategy);
      aspect.visit(node);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);
      assert.equal(appendToBackendOutputListMock.mock.callCount(), 3);

      assert.equal(
        appendToBackendOutputListMock.mock.calls[0].arguments.length,
        2,
      );
      assert.equal(
        appendToBackendOutputListMock.mock.calls[0].arguments[0],
        'AWS::Amplify::Geo',
      );

      assert.equal(
        appendToBackendOutputListMock.mock.calls[1].arguments.length,
        2,
      );

      /**
        {
          version: '1',
          payload: {
            map: JSON.stringify({
              default: "testMapResource",
              items: [{
                name: "testMapResource",
                apiKey: "TOKEN_STRING"
              }]
            })
          }
        }
       */
      assert.ok(
        JSON.parse(
          appendToBackendOutputListMock.mock.calls[1].arguments[1].payload.map,
        ).items[0].apiKey.includes('TOKEN'),
      );

      assert.equal(
        appendToBackendOutputListMock.mock.calls[2].arguments.length,
        2,
      );
      assert.deepStrictEqual(
        appendToBackendOutputListMock.mock.calls[2].arguments[1],
        {
          version: '1',
          payload: {
            searchIndices: JSON.stringify({
              default: 'testPlaceIndex',
              items: [
                {
                  name: 'testPlaceIndex',
                },
              ],
            }),
          },
        },
      );
    });
  });
});

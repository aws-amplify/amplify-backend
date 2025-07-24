import { beforeEach, describe, it } from 'node:test';
import { AmplifyMap } from './map_resource.js';
import { App, Stack } from 'aws-cdk-lib';
import assert from 'node:assert';

void describe('AmplifyMap', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app);
  });

  void it('creates a map resource', () => {
    const map = new AmplifyMap(stack, 'testMap', {
      name: 'testMapName',
    });

    assert.ok(map);
    assert.equal(map.name, 'testMapName');
    assert.equal(map.id, 'testMap');
  });

  void it('sets name property correctly', () => {
    const map = new AmplifyMap(stack, 'testMap', {
      name: 'myTestMap',
    });

    assert.equal(map.name, 'myTestMap');
  });

  void it('exposes map resources correctly', () => {
    const map = new AmplifyMap(stack, 'testMap', {
      name: 'testMapName',
    });

    assert.ok(map.resources);
    assert.ok(Array.isArray(map.resources.policies));
    assert.equal(typeof map.resources.region, 'string');
  });

  void it('returns correct resource ARN', () => {
    const map = new AmplifyMap(stack, 'testMap', {
      name: 'testMapName',
    });

    const arn = map.getResourceArn();
    assert.ok(arn.includes('arn:'));
    assert.ok(arn.includes('geo-maps'));
    assert.ok(arn.includes('provider/default'));
  });

  void it('sets stack property correctly', () => {
    const map = new AmplifyMap(stack, 'testMap', {
      name: 'testMapName',
    });

    assert.equal(map.stack, stack);
  });

  void it('generates ARN with correct partition and region', () => {
    const stackWithRegion = new Stack(app, 'TestStack', {
      env: { region: 'us-west-2' },
    });

    const map = new AmplifyMap(stackWithRegion, 'testMap', {
      name: 'testMapName',
    });

    const arn = map.getResourceArn();
    assert.ok(
      arn.match(
        /^arn:\$\{Token\[AWS\.Partition\.[^\]]+\]\}:geo-maps:[^:]*::provider\/default$/,
      ),
    );
  });

  void it('handles multiple map resources', () => {
    const mapNames = ['simple-map', 'complex_map_name', 'MapWithCamelCase'];

    mapNames.forEach((mapName, index) => {
      const map = new AmplifyMap(stack, `testMap${index}`, {
        name: mapName,
      });

      assert.equal(map.name, mapName);
    });
  });

  void describe('resource properties validation', () => {
    void it('creates map with minimal required properties', () => {
      const stackWithRegion = new Stack(app, 'TestStack', {
        env: { region: 'us-west-2' },
      });
      const map = new AmplifyMap(stackWithRegion, 'minimalMap', {
        name: 'minimal',
      });

      assert.equal(map.name, 'minimal');
      assert.equal(map.id, 'minimalMap');
      assert.ok(map.resources);
      assert.equal(map.resources.region, 'us-west-2');
      assert.ok(map.stack);
    });
  });
});

import { beforeEach, describe, it } from 'node:test';
import { AmplifyPlace } from './place_resource.js';
import { App, Stack } from 'aws-cdk-lib';
import assert from 'node:assert';

void describe('AmplifyPlace', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app);
  });

  void it('creates a place resource', () => {
    const place = new AmplifyPlace(stack, 'testPlace', {
      name: 'testPlaceName',
    });

    assert.ok(place);
    assert.equal(place.name, 'testPlaceName');
    assert.equal(place.id, 'testPlace');
  });

  void it('sets name property correctly', () => {
    const place = new AmplifyPlace(stack, 'testPlace', {
      name: 'myTestPlace',
    });

    assert.equal(place.name, 'myTestPlace');
  });

  void it('returns correct resource ARN', () => {
    const place = new AmplifyPlace(stack, 'testPlace', {
      name: 'testPlaceName',
    });

    const arn = place.getResourceArn();
    assert.ok(arn.includes('arn:'));
    assert.ok(arn.includes('geo-places'));
    assert.ok(arn.includes('provider/default'));
  });

  void it('sets stack property correctly', () => {
    const place = new AmplifyPlace(stack, 'testPlace', {
      name: 'testPlaceName',
    });

    assert.equal(place.stack, stack);
  });

  void it('generates ARN with correct partition and region', () => {
    const stackWithRegion = new Stack(app, 'TestStack', {
      env: { region: 'us-west-2' },
    });

    const place = new AmplifyPlace(stackWithRegion, 'testPlace', {
      name: 'testPlaceName',
    });

    const arn = place.getResourceArn();
    assert.ok(
      arn.match(
        /^arn:\$\{Token\[AWS\.Partition\.[^\]]+\]\}:geo-places:[^:]*::provider\/default$/,
      ),
    );
  });

  void it('handles multiple place resources', () => {
    const placeNames = [
      'simple-place',
      'complex_place_name',
      'PlaceWithCamelCase',
    ];

    placeNames.forEach((placeName, index) => {
      const place = new AmplifyPlace(stack, `testPlace${index}`, {
        name: placeName,
      });

      assert.equal(place.name, placeName);
    });
  });

  void describe('resource properties validation', () => {
    void it('creates place with minimal required properties', () => {
      const stackWithRegion = new Stack(app, 'TestStack', {
        env: { region: 'us-west-2' },
      });
      const place = new AmplifyPlace(stackWithRegion, 'minimalPlace', {
        name: 'minimal',
      });

      assert.equal(place.name, 'minimal');
      assert.equal(place.id, 'minimalPlace');
      assert.ok(place.stack);
    });
  });
});

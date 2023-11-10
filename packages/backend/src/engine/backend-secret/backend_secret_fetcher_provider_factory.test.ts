import { App, Stack } from 'aws-cdk-lib';
import { describe, it } from 'node:test';
import { BackendSecretFetcherProviderFactory } from './backend_secret_fetcher_provider_factory.js';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

const testProviderId1 = 'testProvider1';
const testProviderId2 = 'testProvider2';
const backendIdentifier: BackendIdentifier = {
  namespace: 'testBackendId',
  name: 'testBranchName',
  type: 'branch',
};

void describe('getOrCreate', () => {
  const providerFactory = new BackendSecretFetcherProviderFactory();
  void it('creates new providers', () => {
    const app = new App();
    const stack = new Stack(app);
    providerFactory.getOrCreateInstance(
      stack,
      testProviderId1,
      backendIdentifier
    );
    providerFactory.getOrCreateInstance(
      stack,
      testProviderId2,
      backendIdentifier
    );
    const template = Template.fromStack(stack);

    const resources = template.findResources('AWS::Lambda::Function');
    const names = Object.keys(resources);
    // each provider creates 2 lambda resources
    assert.equal(Object.keys(names).length, 4);
    assert.equal(
      names.filter((name) => name.startsWith(testProviderId1)).length,
      2
    );
    assert.equal(
      names.filter((name) => name.startsWith(testProviderId2)).length,
      2
    );
  });

  void it('returns an existing provider', () => {
    const app = new App();
    const stack = new Stack(app);
    providerFactory.getOrCreateInstance(
      stack,
      testProviderId1,
      backendIdentifier
    );
    providerFactory.getOrCreateInstance(
      stack,
      testProviderId1,
      backendIdentifier
    );
    const template = Template.fromStack(stack);

    const resources = template.findResources('AWS::Lambda::Function');
    const names = Object.keys(resources);
    assert.equal(Object.keys(names).length, 2);
    names.forEach((name) => assert.ok(name.startsWith(testProviderId1)));
  });
});

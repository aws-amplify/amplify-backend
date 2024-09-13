import { App, Stack } from 'aws-cdk-lib';
import { beforeEach, describe, it } from 'node:test';
import { BackendSecretFetcherProviderFactory } from './backend_secret_fetcher_provider_factory.js';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import {
  BackendSecretFetcherFactory,
  SECRET_RESOURCE_PROVIDER_ID,
} from './backend_secret_fetcher_factory.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

const secretResourceType = 'Custom::SecretFetcherResource';
const namespace = 'testId';
const name = 'testBranch';
const secretName1 = 'testSecretName1';
const secretLastUpdated = '1245462';
const secretName2 = 'testSecretName2';
const backendId: BackendIdentifier = {
  namespace,
  name,
  type: 'branch',
};

void describe('getOrCreate', () => {
  const providerFactory = new BackendSecretFetcherProviderFactory();
  const resourceFactory = new BackendSecretFetcherFactory(providerFactory);

  beforeEach(() => {
    BackendSecretFetcherFactory.clearRegisteredSecrets();
  });

  void it('create different secrets', () => {
    const app = new App();
    const stack = new Stack(app);
    stack.node.setContext('secretLastUpdated', secretLastUpdated);
    BackendSecretFetcherFactory.registerSecret(secretName1);
    BackendSecretFetcherFactory.registerSecret(secretName2);
    resourceFactory.getOrCreate(stack, backendId);

    const template = Template.fromStack(stack);
    // only one custom resource is created that fetches all secrets
    template.resourceCountIs(secretResourceType, 1);
    const customResources = template.findResources(secretResourceType, {
      Properties: {
        namespace,
        name,
        secretNames: [secretName1, secretName2],
        secretLastUpdated,
      },
    });
    assert.equal(Object.keys(customResources).length, 1);

    // only 1 secret fetcher lambda and 1 resource provider lambda are created.
    const providers = template.findResources('AWS::Lambda::Function');
    const names = Object.keys(providers);
    assert.equal(Object.keys(names).length, 2);
    assert.equal(
      names.filter((name) => name.startsWith(SECRET_RESOURCE_PROVIDER_ID))
        .length,
      2
    );
  });

  void it('does not create duplicate resource for the same secret name', () => {
    const app = new App();
    const stack = new Stack(app);
    // ensure only 1 secret name is registered if they are duplicates
    BackendSecretFetcherFactory.registerSecret(secretName1);
    BackendSecretFetcherFactory.registerSecret(secretName1);
    assert.equal(BackendSecretFetcherFactory.secretNames.size, 1);
    assert.equal(
      Array.from(BackendSecretFetcherFactory.secretNames)[0],
      secretName1
    );

    // ensure only 1 resource is created even if this is called twice
    resourceFactory.getOrCreate(stack, backendId);
    resourceFactory.getOrCreate(stack, backendId);

    const template = Template.fromStack(stack);
    template.resourceCountIs(secretResourceType, 1);
    const customResources = template.findResources(secretResourceType);
    const resourceName = Object.keys(customResources)[0];

    const body = customResources[resourceName]['Properties'];
    assert.strictEqual(body['namespace'], namespace);
    assert.strictEqual(body['name'], name);
    assert.equal(body['secretNames'].length, 1);
    assert.equal(body['secretNames'][0], secretName1);
  });
});

import { App, Stack } from 'aws-cdk-lib';
import { describe, it } from 'node:test';
import { BackendSecretResourceProviderFactory } from './backend_secret_resource_provider_factory.js';
import { SecretClient } from '@aws-amplify/backend-secret';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import {
  BackendSecretResourceFactory,
  SECRET_RESOURCE_PROVIDER_ID,
  SECRET_RESOURCE_TYPE,
} from './backend_secret_resource_factory.js';

const backendId = 'testId';
const branchName = 'testBranch';
const secretName1 = 'testSecretName1';
const secretName2 = 'testSecretName2';
const uniqueBackendIdentifier: UniqueBackendIdentifier = {
  backendId,
  branchName,
};

describe('BackendSecretResourceFactory', () => {
  const providerFactory = new BackendSecretResourceProviderFactory(
    SecretClient()
  );
  const resourceFactory = new BackendSecretResourceFactory(providerFactory);

  it('create different secrets', () => {
    const app = new App();
    const stack = new Stack(app);
    resourceFactory.getOrCreate(stack, secretName1, uniqueBackendIdentifier);
    resourceFactory.getOrCreate(stack, secretName2, uniqueBackendIdentifier);

    const template = Template.fromStack(stack);
    template.resourceCountIs(SECRET_RESOURCE_TYPE, 2);
    let customResources = template.findResources(SECRET_RESOURCE_TYPE, {
      Properties: {
        backendId,
        branchName,
        secretName: secretName1,
      },
    });
    assert.equal(Object.keys(customResources).length, 1);

    customResources = template.findResources(SECRET_RESOURCE_TYPE, {
      Properties: {
        backendId,
        branchName,
        secretName: secretName2,
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

  it('does not create duplicate resource for the same secret name', () => {
    const app = new App();
    const stack = new Stack(app);
    resourceFactory.getOrCreate(stack, secretName1, uniqueBackendIdentifier);
    resourceFactory.getOrCreate(stack, secretName1, uniqueBackendIdentifier);

    const template = Template.fromStack(stack);
    template.resourceCountIs(SECRET_RESOURCE_TYPE, 1);
    const customResources = template.findResources(SECRET_RESOURCE_TYPE);
    const resourceName = Object.keys(customResources)[0];

    const body = customResources[resourceName]['Properties'];
    assert.strictEqual(body['backendId'], backendId);
    assert.strictEqual(body['branchName'], branchName);
    assert.strictEqual(body['secretName'], secretName1);
  });
});

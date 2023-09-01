import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CfnTokenBackendSecret } from './backend_secret.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const secretFetcherResourceType = 'Custom::SecretFetcherResource';

describe('BackendSecret', () => {
  const backendId = 'testId';
  const branchName = 'testBranch';
  const secretName1 = 'testSecretName1';
  const secretName2 = 'testSecretName2';
  const uniqueBackendIdentifier: UniqueBackendIdentifier = {
    backendId,
    branchName,
  };

  it('resolves a secret', () => {
    const secret = new CfnTokenBackendSecret(secretName1);
    const app = new App();
    const stack = new Stack(app);
    secret.resolve(stack, uniqueBackendIdentifier);
    const template = Template.fromStack(stack);
    template.resourceCountIs(secretFetcherResourceType, 1);
    const customResources = template.findResources(secretFetcherResourceType);
    const resourceName = Object.keys(customResources)[0];

    const body = customResources[resourceName]['Properties'];
    assert.strictEqual(body['backendId'], backendId);
    assert.strictEqual(body['branchName'], branchName);
    assert.strictEqual(body['secretName'], secretName1);
  });

  it('create different resources for different secret names', () => {
    const app = new App();
    const stack = new Stack(app);
    const secret1 = new CfnTokenBackendSecret(secretName1);
    secret1.resolve(stack, uniqueBackendIdentifier);
    const secret2 = new CfnTokenBackendSecret(secretName2);
    secret2.resolve(stack, uniqueBackendIdentifier);

    const template = Template.fromStack(stack);
    template.resourceCountIs(secretFetcherResourceType, 2);
    let customResources = template.findResources(secretFetcherResourceType, {
      Properties: {
        backendId,
        branchName,
        secretName: secretName1,
      },
    });
    assert.equal(Object.keys(customResources).length, 1);

    customResources = template.findResources(secretFetcherResourceType, {
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
    ['SecretFetcherLambda', 'SecretFetcherResourceProvider'].forEach(
      (namePrefix) => {
        const filterNames = names.filter((name) => name.startsWith(namePrefix));
        assert.equal(Object.keys(filterNames).length, 1);
      }
    );
  });

  it('does not create duplicate resource for the same secret name', () => {
    const app = new App();
    const stack = new Stack(app);
    const secret1 = new CfnTokenBackendSecret(secretName1);
    secret1.resolve(stack, uniqueBackendIdentifier);
    const secret2 = new CfnTokenBackendSecret(secretName1);
    secret2.resolve(stack, uniqueBackendIdentifier);

    const template = Template.fromStack(stack);
    template.resourceCountIs(secretFetcherResourceType, 1);
    const customResources = template.findResources(secretFetcherResourceType);
    const resourceName = Object.keys(customResources)[0];

    const body = customResources[resourceName]['Properties'];
    assert.strictEqual(body['backendId'], backendId);
    assert.strictEqual(body['branchName'], branchName);
    assert.strictEqual(body['secretName'], secretName1);
  });
});

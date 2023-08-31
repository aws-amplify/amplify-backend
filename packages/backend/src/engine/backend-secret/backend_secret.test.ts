import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BaseBackendSecret } from './backend_secret.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

const secretFetcherResourceType = 'Custom::SecretFetcherResouce';

describe('BackendSecret', () => {
  it('resolves a secret', () => {
    const secret = new BaseBackendSecret('testSecretName');
    const app = new App();
    const stack = new Stack(app);
    secret.resolve(stack, 'testId', 'testBranch');
    const template = Template.fromStack(stack);
    template.resourceCountIs(secretFetcherResourceType, 1);
    const customResources = template.findResources(secretFetcherResourceType);
    const resourceName = Object.keys(customResources)[0];

    const body = customResources[resourceName]['Properties'];
    assert.strictEqual(body['backendId'], 'testId');
    assert.strictEqual(body['branchName'], 'testBranch');
    assert.strictEqual(body['secretName'], 'testSecretName');
  });

  it('create different resources for different secret names', () => {
    const app = new App();
    const stack = new Stack(app);
    const secret1 = new BaseBackendSecret('testName1');
    secret1.resolve(stack, 'testId', 'testBranch');
    const secret2 = new BaseBackendSecret('testName2');
    secret2.resolve(stack, 'testId', 'testBranch');

    const template = Template.fromStack(stack);
    template.resourceCountIs(secretFetcherResourceType, 2);
    let customResources = template.findResources(secretFetcherResourceType, {
      Properties: {
        backendId: 'testId',
        branchName: 'testBranch',
        secretName: 'testName2',
      },
    });
    assert.equal(Object.keys(customResources).length, 1);

    customResources = template.findResources(secretFetcherResourceType, {
      Properties: {
        backendId: 'testId',
        branchName: 'testBranch',
        secretName: 'testName1',
      },
    });
    assert.equal(Object.keys(customResources).length, 1);

    // only 1 secret fetcher lambda and 1 resource provider lambda are created.
    const providers = template.findResources('AWS::Lambda::Function');
    const names = Object.keys(providers);
    assert.equal(Object.keys(names).length, 2);
    ['SecretFetcherLambda', 'SecretFetcherResouceProvider'].forEach(
      (namePrefix) => {
        const filterNames = names.filter((name) => name.startsWith(namePrefix));
        assert.equal(Object.keys(filterNames).length, 1);
      }
    );
  });

  it('does not create duplicate resource for the same secret name', () => {
    const app = new App();
    const stack = new Stack(app);
    const secret1 = new BaseBackendSecret('testName');
    secret1.resolve(stack, 'testId', 'testBranch');
    const secret2 = new BaseBackendSecret('testName');
    secret2.resolve(stack, 'testId', 'testBranch');

    const template = Template.fromStack(stack);
    template.resourceCountIs(secretFetcherResourceType, 1);
    const customResources = template.findResources(secretFetcherResourceType);
    const resourceName = Object.keys(customResources)[0];

    const body = customResources[resourceName]['Properties'];
    assert.strictEqual(body['backendId'], 'testId');
    assert.strictEqual(body['branchName'], 'testBranch');
    assert.strictEqual(body['secretName'], 'testName');
  });
});

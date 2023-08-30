import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BackendParameterImpl } from './backend_parameter.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

describe('SSMBackendParameter', () => {
  it('resolves a parameter', () => {
    const param = new BackendParameterImpl('testParamName');
    const app = new App();
    const stack = new Stack(app);
    param.resolve(stack, 'testId', 'testBranch');
    const template = Template.fromStack(stack);
    template.resourceCountIs('Custom::ParameterFetcherResouce', 1);
    const customResources = template.findResources(
      'Custom::ParameterFetcherResouce'
    );
    const resourceName = Object.keys(customResources)[0];

    const body = customResources[resourceName]['Properties'];
    assert.strictEqual(body['backendId'], 'testId');
    assert.strictEqual(body['branchName'], 'testBranch');
    assert.strictEqual(body['parameterName'], 'testParamName');
  });

  it('create different resources for different parameter names', () => {
    const app = new App();
    const stack = new Stack(app);
    const param1 = new BackendParameterImpl('testParam1');
    param1.resolve(stack, 'testId', 'testBranch');
    const param2 = new BackendParameterImpl('testParam2');
    param2.resolve(stack, 'testId', 'testBranch');

    const template = Template.fromStack(stack);
    template.resourceCountIs('Custom::ParameterFetcherResouce', 2);
    let customResources = template.findResources(
      'Custom::ParameterFetcherResouce',
      {
        Properties: {
          backendId: 'testId',
          branchName: 'testBranch',
          parameterName: 'testParam2',
        },
      }
    );
    assert.equal(Object.keys(customResources).length, 1);

    customResources = template.findResources(
      'Custom::ParameterFetcherResouce',
      {
        Properties: {
          backendId: 'testId',
          branchName: 'testBranch',
          parameterName: 'testParam1',
        },
      }
    );
    assert.equal(Object.keys(customResources).length, 1);
  });

  it('does not create duplicate resource for the same parameter name', () => {
    const app = new App();
    const stack = new Stack(app);
    const param1 = new BackendParameterImpl('testParamName');
    param1.resolve(stack, 'testId', 'testBranch');
    const param2 = new BackendParameterImpl('testParamName');
    param2.resolve(stack, 'testId', 'testBranch');

    const template = Template.fromStack(stack);
    template.resourceCountIs('Custom::ParameterFetcherResouce', 1);
    const customResources = template.findResources(
      'Custom::ParameterFetcherResouce'
    );
    const resourceName = Object.keys(customResources)[0];

    const body = customResources[resourceName]['Properties'];
    assert.strictEqual(body['backendId'], 'testId');
    assert.strictEqual(body['branchName'], 'testBranch');
    assert.strictEqual(body['parameterName'], 'testParamName');
  });
});

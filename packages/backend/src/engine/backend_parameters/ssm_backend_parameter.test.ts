import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SSMBackendParameter } from './ssm_backend_parameter.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

describe('SSMBackendParameter', () => {
  it('resolves a parameter', () => {
    const param = new SSMBackendParameter('testParamName');
    const app = new App();
    const stack = new Stack(app);
    param.resolve(stack, 'testId', 'testBranch');
    const template = Template.fromStack(stack);
    template.resourceCountIs('Custom::AWS', 1);
    const customResources = template.findResources('Custom::AWS');
    const resourceName = Object.keys(customResources)[0];

    ['Create', 'Update'].forEach((op) => {
      const createBodyJSON = customResources[resourceName]['Properties'][op];
      const createBody = JSON.parse(createBodyJSON);
      assert.strictEqual(createBody.service, 'SSM');
      assert.strictEqual(createBody.action, 'getParameter');
      assert.strictEqual(
        createBody.parameters.Name,
        '/amplify/testId/testBranch/testParamName'
      );
    });
  });
});

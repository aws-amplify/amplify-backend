import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CfnResource, Stack } from 'aws-cdk-lib';
import { addCfnResourceDependency } from './cfn_dependency';

const createResource = (
  withNewApi: boolean,
): { resource: CfnResource; calls: { api: string; target: CfnResource }[] } => {
  const calls: { api: string; target: CfnResource }[] = [];
  const resource = {
    addDependency: (target: CfnResource) =>
      calls.push({ api: 'addDependency', target }),
  } as unknown as Record<string, unknown>;
  if (withNewApi) {
    resource.addResourceDependency = (target: CfnResource) =>
      calls.push({ api: 'addResourceDependency', target });
  }
  return { resource: resource as unknown as CfnResource, calls };
};

void describe('addCfnResourceDependency', () => {
  void it('prefers addResourceDependency when available', () => {
    const { resource, calls } = createResource(true);
    const target = {} as CfnResource;

    addCfnResourceDependency(resource, target);

    assert.deepStrictEqual(calls, [{ api: 'addResourceDependency', target }]);
  });

  void it('falls back to addDependency when addResourceDependency is unavailable', () => {
    const { resource, calls } = createResource(false);
    const target = {} as CfnResource;

    addCfnResourceDependency(resource, target);

    assert.deepStrictEqual(calls, [{ api: 'addDependency', target }]);
  });

  void it('emits a DependsOn entry on a real CfnResource', () => {
    const stack = new Stack();
    const target = new CfnResource(stack, 'Target', { type: 'AWS::CDK::Test' });
    const source = new CfnResource(stack, 'Source', { type: 'AWS::CDK::Test' });

    addCfnResourceDependency(source, target);

    assert.deepStrictEqual(
      source.obtainDependencies().map((dep) => dep.node.id),
      ['Target'],
    );
  });
});

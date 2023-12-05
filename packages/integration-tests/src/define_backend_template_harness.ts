import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import { CDKContextKey } from '@aws-amplify/platform-core';
import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';

/**
 * Asserts that the provided template has resources of 'resourceType' with the expected logical IDs
 */
export const assertExpectedLogicalIds = (
  template: Template,
  resourceType: string,
  expectedLogicalIds: string[]
) => {
  const resources = template.findResources(resourceType);
  assert.deepStrictEqual(
    Object.keys(resources).sort(),
    expectedLogicalIds.sort()
  );
};

/**
 * Synthesizes deterministic `defineBackend` CDK templates for each backend resource
 *
 * Supplies stable CDK context values to the synth process for deterministic synth output
 */
export const synthesizeBackendTemplates: SynthesizeBackendTemplates = <
  T extends Record<string, ConstructFactory<Construct>>
>(
  constructFactories: T
) => {
  try {
    process.env.CDK_CONTEXT_JSON = JSON.stringify({
      [CDKContextKey.BACKEND_NAMESPACE]: 'testAppId',
      [CDKContextKey.BACKEND_NAME]: 'testBranchName',
      [CDKContextKey.DEPLOYMENT_TYPE]: 'branch',
      secretLastUpdated: 123456789,
    });
    return backendTemplatesCollector(constructFactories);
  } finally {
    delete process.env.CDK_CONTEXT_JSON;
  }
};

const backendTemplatesCollector: SynthesizeBackendTemplates = <
  T extends Record<string, ConstructFactory<Construct>>
>(
  constructFactories: T
) => {
  if (Object.keys(constructFactories).length === 0) {
    throw new Error('constructFactories must have at least one entry');
  }
  const backend = defineBackend(constructFactories);
  const result = {
    // need to go up two levels to get the root stack
    root: Template.fromStack(
      Stack.of(backend.resources[Object.keys(constructFactories)[0]]).node
        .scope as Stack
    ),
  } as Partial<{ [K in keyof T]: Template }> & { root: Template };

  for (const [name, construct] of Object.entries(backend.resources)) {
    result[name as keyof T] = Template.fromStack(Stack.of(construct)) as never; // TS can't figure out which "K in keyof T" "name" corresponds to here but this assignment is safe
  }
  return result as { [K in keyof T]: Template } & { root: Template };
};

type SynthesizeBackendTemplates = <
  T extends Record<string, ConstructFactory<Construct>>
>(
  constructFactories: T
) => { [K in keyof T]: Template } & { root: Template };

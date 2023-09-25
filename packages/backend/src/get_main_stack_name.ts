import {
  BranchBackendIdentifier,
  SandboxBackendIdentifier,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';

const mainStackNamePrefix = 'amplify';
const sandboxStackNameSuffix = 'sandbox';

/**
 * Generates a stack name based on the unique deployment identifier
 *
 * This naming convention is shared between stack creation in \@aws-amplify/backend and stack discovery in \@aws-amplify/client-config
 * to allow client config generation to construct stack names to query for output.
 *
 * You should probably not change this ever. It would constitute a huge breaking change to how stacks are discovered later.
 */
export const getMainStackName = (
  uniqueDeploymentIdentifier: UniqueBackendIdentifier
): string => {
  const stackNameSuffix: string = (
    uniqueDeploymentIdentifier as SandboxBackendIdentifier
  ).sandbox
    ? sandboxStackNameSuffix
    : (uniqueDeploymentIdentifier as BranchBackendIdentifier).branchName;
  return `${mainStackNamePrefix}-${uniqueDeploymentIdentifier.backendId}-${stackNameSuffix}`;
};

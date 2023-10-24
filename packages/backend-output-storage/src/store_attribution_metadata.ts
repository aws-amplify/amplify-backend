import { Stack } from 'aws-cdk-lib';
import * as os from 'os';
import { BackendDeploymentType } from '@aws-amplify/platform-core';
import * as fs from 'fs';

/**
 * This key is a small bit of tight coupling to the backend-engine package which sets this context value
 * However, there is not a suitable place for this value to sit in a shared location at this time and this value alone is not enough to justify another package
 */
const deploymentTypeCDKContextKey = 'deployment-type';

/**
 * Stores an attribution metadata string in the stack description of the provided stack
 * Does nothing if the stack already has a non-empty description
 */
export const storeAttributionMetadata = (
  stack: Stack,
  stackType: string,
  libraryPackageJsonAbsolutePath: string
): void => {
  if (
    typeof stack.templateOptions.description === 'string' &&
    stack.templateOptions.description.length > 0
  ) {
    // don't overwrite an existing description
    return;
  }
  stack.templateOptions.description = JSON.stringify(
    getAttributionMetadata(stack, stackType, libraryPackageJsonAbsolutePath)
  );
};

const getAttributionMetadata = (
  stack: Stack,
  stackType: string,
  libraryPackageJsonAbsolutePath: string
): AttributionMetadata => ({
  createdOn: getPlatform(),
  createdBy: getDeploymentEngineType(stack),
  createdWith: getLibraryVersion(libraryPackageJsonAbsolutePath),
  stackType: stackType,
});

const getLibraryVersion = (absolutePackageJsonPath: string): string => {
  if (!fs.existsSync(absolutePackageJsonPath)) {
    throw new Error(
      `Could not find ${absolutePackageJsonPath} to load library version from`
    );
  }
  const packageJsonContents = JSON.parse(
    // we have to use sync fs methods here because this is part of cdk synth
    fs.readFileSync(absolutePackageJsonPath, 'utf-8')
  );
  const libraryVersion = packageJsonContents.version;
  if (typeof libraryVersion !== 'string') {
    throw new Error(
      `Could not parse library version from ${absolutePackageJsonPath}`
    );
  }
  return libraryVersion;
};

const getDeploymentEngineType = (stack: Stack): DeploymentEngineType => {
  const deploymentType: BackendDeploymentType | undefined =
    stack.node.tryGetContext(deploymentTypeCDKContextKey);

  if (deploymentType === undefined) {
    // if no deployment type context value is set, assume the construct is being used in a native CDK project
    return 'AmplifyCDK';
  }

  switch (deploymentType) {
    case BackendDeploymentType.BRANCH:
      return 'AmplifyPipelineDeploy';
    case BackendDeploymentType.SANDBOX:
      return 'AmplifySandbox';
    default:
      throw new Error(
        `Unknown ${deploymentTypeCDKContextKey} CDK context value "${
          deploymentType as string
        }"`
      );
  }
};

const getPlatform = (): Platform => {
  switch (os.platform()) {
    case 'darwin':
      return 'Mac';
    case 'win32':
      return 'Windows';
    case 'linux':
      return 'Linux';
    default:
      return 'Other';
  }
};

export type AttributionMetadata = {
  createdOn: Platform;
  createdBy: DeploymentEngineType;
  createdWith: string;
  stackType: string;
};

export type DeploymentEngineType =
  | 'AmplifyPipelineDeploy'
  | 'AmplifySandbox'
  | 'AmplifyCDK';

export type Platform = 'Mac' | 'Windows' | 'Linux' | 'Other';

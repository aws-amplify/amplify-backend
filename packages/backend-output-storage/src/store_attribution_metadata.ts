import { Stack } from 'aws-cdk-lib';
import * as _os from 'os';
import { CDKContextKey } from '@aws-amplify/platform-core';
import * as _fs from 'fs';
import { DeploymentType } from '@aws-amplify/plugin-types';

/**
 * Stores BI metrics information in stack descriptions
 */
export class AttributionMetadataStorage {
  /**
   * Constructor with props for injecting test mocks
   */
  constructor(
    private readonly fs: typeof _fs = _fs,
    private readonly os: typeof _os = _os
  ) {}

  /**
   * Stores an attribution metadata string in the stack description of the provided stack
   * Does nothing if the stack already has a non-empty description
   */
  storeAttributionMetadata = (
    stack: Stack,
    stackType: string,
    libraryPackageJsonAbsolutePath: string,
    additionalMetadata: Record<string, string> = {}
  ): void => {
    if (
      typeof stack.templateOptions.description === 'string' &&
      stack.templateOptions.description.length > 0
    ) {
      // don't overwrite an existing description
      return;
    }
    stack.templateOptions.description = JSON.stringify(
      this.getAttributionMetadata(
        stack,
        stackType,
        libraryPackageJsonAbsolutePath,
        additionalMetadata
      )
    );
  };

  private getAttributionMetadata = (
    stack: Stack,
    stackType: string,
    libraryPackageJsonAbsolutePath: string,
    additionalMetadata: Record<string, string>
  ): AttributionMetadata => ({
    createdOn: this.getPlatform(),
    createdBy: this.getDeploymentEngineType(stack),
    createdWith: this.getLibraryVersion(libraryPackageJsonAbsolutePath),
    stackType: stackType,
    metadata: additionalMetadata,
  });

  private getLibraryVersion = (absolutePackageJsonPath: string): string => {
    if (!this.fs.existsSync(absolutePackageJsonPath)) {
      throw new Error(
        `Could not find ${absolutePackageJsonPath} to load library version from`
      );
    }
    const packageJsonContents = JSON.parse(
      // we have to use sync fs methods here because this is part of cdk synth
      this.fs.readFileSync(absolutePackageJsonPath, 'utf-8')
    );
    const libraryVersion = packageJsonContents.version;
    if (typeof libraryVersion !== 'string') {
      throw new Error(
        `Could not parse library version from ${absolutePackageJsonPath}`
      );
    }
    return libraryVersion;
  };

  private getDeploymentEngineType = (stack: Stack): DeploymentEngineType => {
    const deploymentType: DeploymentType | undefined = stack.node.tryGetContext(
      CDKContextKey.DEPLOYMENT_TYPE
    );

    if (deploymentType === undefined) {
      // if no deployment type context value is set, assume the construct is being used in a native CDK project
      return 'AmplifyCDK';
    }

    switch (deploymentType) {
      case 'branch':
        return 'AmplifyPipelineDeploy';
      case 'sandbox':
        return 'AmplifySandbox';
      default:
        throw new Error(
          `Unknown ${CDKContextKey.DEPLOYMENT_TYPE} CDK context value "${
            deploymentType as string
          }"`
        );
    }
  };

  private getPlatform = (): Platform => {
    switch (this.os.platform()) {
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
}

export type AttributionMetadata = {
  /**
   * The OS that synthesized this stack
   */
  createdOn: Platform;
  /**
   * The synthesis engine that generated this stack
   */
  createdBy: DeploymentEngineType;
  /**
   * The library version that created this metadata
   */
  createdWith: string;
  /**
   * String that identifies what type of stack this metadata is set on
   */
  stackType: string;

  /**
   * Field where constructs can put additional information for BI tracking
   */
  metadata: Record<string, string>;
};

export type DeploymentEngineType =
  | 'AmplifyPipelineDeploy'
  | 'AmplifySandbox'
  | 'AmplifyCDK';

export type Platform = 'Mac' | 'Windows' | 'Linux' | 'Other';

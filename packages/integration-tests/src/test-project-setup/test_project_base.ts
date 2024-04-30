import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  ClientConfigFileBaseName,
  ClientConfigFormat,
  getClientConfigPath,
} from '@aws-amplify/client-config';
import { ampxCli } from '../process-controller/process_controller.js';
import {
  confirmDeleteSandbox,
  interruptSandbox,
  rejectCleanupSandbox,
  waitForSandboxDeploymentToPrintTotalTime,
} from '../process-controller/predicated_action_macros.js';

import {
  CloudFormationClient,
  DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';
import fsp from 'fs/promises';
import assert from 'node:assert';
import { CopyDefinition } from '../process-controller/types.js';

export type PlatformDeploymentThresholds = {
  onWindows: number;
  onOther: number;
};

/**
 * Keeps test project update info.
 */
export type TestProjectUpdate = {
  /**
   * An array of source and destination objects. All replacements will be part of the update operation
   */
  replacements: CopyDefinition[];
  /**
   * Define a threshold for the hotswap deployment time
   * Windows has a separate threshold because it is consistently slower than other platforms
   * https://github.com/microsoft/Windows-Dev-Performance/issues/17
   */
  deployThresholdSec: PlatformDeploymentThresholds;
};

/**
 * The base abstract class for test project.
 */
export abstract class TestProjectBase {
  abstract readonly sourceProjectAmplifyDirPath: URL;

  /**
   * The base test project class constructor.
   */
  constructor(
    readonly name: string,
    readonly projectDirPath: string,
    readonly projectAmplifyDirPath: string,
    protected readonly cfnClient: CloudFormationClient
  ) {}

  /**
   * Deploy the project.
   */
  async deploy(
    backendIdentifier: BackendIdentifier,
    environment?: Record<string, string>
  ) {
    if (backendIdentifier.type === 'sandbox') {
      await ampxCli(['sandbox'], this.projectDirPath, {
        env: environment,
      })
        .do(waitForSandboxDeploymentToPrintTotalTime())
        .do(interruptSandbox())
        .do(rejectCleanupSandbox())
        .run();
    } else {
      await ampxCli(
        [
          'pipeline-deploy',
          '--branch',
          backendIdentifier.name,
          '--appId',
          backendIdentifier.namespace,
        ],
        this.projectDirPath,
        {
          env: {
            CI: 'true',
            ...environment,
          },
        }
      ).run();
    }
  }

  /**
   * Tear down the project.
   */
  async tearDown(backendIdentifier: BackendIdentifier) {
    if (backendIdentifier.type === 'sandbox') {
      await ampxCli(['sandbox', 'delete'], this.projectDirPath)
        .do(confirmDeleteSandbox())
        .run();
    } else {
      await this.cfnClient.send(
        new DeleteStackCommand({
          StackName:
            BackendIdentifierConversions.toStackName(backendIdentifier),
        })
      );
    }
  }

  /**
   * Gets all project update cases. Override this method if the update (hotswap) test is relevant.
   */
  async getUpdates(): Promise<TestProjectUpdate[]> {
    return [];
  }

  /**
   * Verify the project after deployment.
   */
  // suppressing because subclass implementations can use backendId
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async assertPostDeployment(backendId: BackendIdentifier): Promise<void> {
    await this.assertClientConfigExists(
      this.projectDirPath,
      ClientConfigFormat.JSON
    );
  }

  /**
   * Verify client config file is generated with the provided directory and format.
   */
  async assertClientConfigExists(dir?: string, format?: ClientConfigFormat) {
    const clientConfigStats = await fsp.stat(
      await getClientConfigPath(
        ClientConfigFileBaseName.DEFAULT,
        dir ?? this.projectDirPath,
        format
      )
    );

    assert.ok(clientConfigStats.isFile());
  }
}

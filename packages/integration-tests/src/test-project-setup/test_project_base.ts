import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  ClientConfigFormat,
  getClientConfigPath,
} from '@aws-amplify/client-config';
import { amplifyCli } from '../process-controller/process_controller.js';
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

/**
 * Keeps test project update info.
 */
export type TestProjectUpdate = {
  sourceFile: URL;
  projectFile: URL;
  deployThresholdSec: number;
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
    private readonly cfnClient: CloudFormationClient
  ) {}

  /**
   * Deploy the project.
   */
  async deploy(backendIdentifier: BackendIdentifier) {
    if (backendIdentifier.type === 'sandbox') {
      await amplifyCli(['sandbox'], this.projectDirPath)
        .do(waitForSandboxDeploymentToPrintTotalTime())
        .do(interruptSandbox())
        .do(rejectCleanupSandbox())
        .run();
    } else {
      await amplifyCli(
        [
          'pipeline-deploy',
          '--branch',
          backendIdentifier.name,
          '--appId',
          backendIdentifier.namespace,
        ],
        this.projectDirPath,
        {
          env: { CI: 'true' },
        }
      ).run();
    }
  }

  /**
   * Tear down the project.
   */
  async tearDown(backendIdentifier: BackendIdentifier) {
    if (backendIdentifier.type === 'sandbox') {
      await amplifyCli(['sandbox', 'delete'], this.projectDirPath)
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
   * Verify client config file is generated with the provided directory and format
   */
  async assertPostDeployment(dir?: string, format?: ClientConfigFormat) {
    const clientConfigStats = await fsp.stat(
      await getClientConfigPath(dir ?? this.projectDirPath, format)
    );

    // check that the client config is a file
    // we're not validating content here because it was causing e2e noise for small updates without providing value
    // individual components of the client config are tested at the unit / integration level
    assert.ok(clientConfigStats.isFile());
  }
}

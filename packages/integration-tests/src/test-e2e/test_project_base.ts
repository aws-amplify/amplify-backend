import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { amplifyCli } from '../process-controller/process_controller.js';
import {
  confirmDeleteSandbox,
  interruptSandbox,
  rejectCleanupSandbox,
  waitForSandboxDeployment,
} from '../process-controller/stdio_interaction_macros.js';
import {
  CloudFormationClient,
  DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';
import { TestProject } from './test_project.js';

/**
 * The base abstract class for test project.
 */
export abstract class TestProjectBase implements TestProject {
  abstract setUpDeployEnvironment: (
    backendId: UniqueBackendIdentifier
  ) => Promise<void>;
  abstract clearDeployEnvironment: (
    backendId: UniqueBackendIdentifier
  ) => Promise<void>;
  abstract assertDeployment: () => Promise<void>;

  /**
   * The base test project class constructor.
   */
  constructor(
    readonly name: string,
    readonly projectDirPath: string,
    readonly projectAmplifyDirPath: string,
    private readonly cfnClient: CloudFormationClient
  ) {}

  deploy = async (backendIdentifier: UniqueBackendIdentifier) => {
    if (backendIdentifier instanceof SandboxBackendIdentifier) {
      await amplifyCli(['sandbox'], this.projectDirPath)
        .do(waitForSandboxDeployment)
        .do(interruptSandbox)
        .do(rejectCleanupSandbox)
        .run();
    } else {
      await amplifyCli(
        [
          'pipeline-deploy',
          '--branch',
          backendIdentifier.disambiguator,
          '--appId',
          backendIdentifier.backendId,
        ],
        this.projectDirPath,
        {
          env: { CI: 'true' },
        }
      ).run();
      await amplifyCli(
        [
          'generate',
          'config',
          '--branch',
          backendIdentifier.disambiguator,
          '--appId',
          backendIdentifier.backendId,
        ],
        this.projectDirPath
      ).run();
    }
  };

  tearDown = async (backendIdentifier: UniqueBackendIdentifier) => {
    if (backendIdentifier instanceof SandboxBackendIdentifier) {
      await amplifyCli(['sandbox', 'delete'], this.projectDirPath)
        .do(confirmDeleteSandbox)
        .run();
    } else {
      await this.cfnClient.send(
        new DeleteStackCommand({
          StackName: `amplify-${backendIdentifier.backendId}-${backendIdentifier.disambiguator}`,
        })
      );
    }
  };
}

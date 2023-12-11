import { cdkCli } from '../../process-controller/process_controller.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

/**
 * The base abstract class for test cdk project.
 */
export abstract class TestCdkProjectBase {
  /**
   * The base test project class constructor.
   */
  constructor(
    readonly name: string,
    readonly projectDirPath: string,
    protected readonly cfnClient: CloudFormationClient
  ) {}

  deploy = async () => {
    await cdkCli(
      ['deploy', '--require-approval', 'never'],
      this.projectDirPath
    ).run();
  };

  tearDown = async () => {
    await cdkCli(['destroy', '--force'], this.projectDirPath).run();
  };

  abstract assertPostDeployment(): Promise<void>;
}

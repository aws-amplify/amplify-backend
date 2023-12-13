import { cdkCli } from '../../process-controller/process_controller.js';
import { shortUuid } from '../../short_uuid.js';

/**
 * The base abstract class for test cdk project.
 */
export abstract class TestCdkProjectBase {
  readonly stackName: string;

  /**
   * The base test project class constructor.
   */
  constructor(readonly name: string, readonly projectDirPath: string) {
    this.stackName = `amplify-test-cdk-stack-${shortUuid()}`;
  }

  deploy = async () => {
    await cdkCli(
      [
        'deploy',
        this.stackName,
        '--require-approval',
        'never',
        '--context',
        `test-stack-name=${this.stackName}`,
      ],
      this.projectDirPath
    ).run();
  };

  tearDown = async () => {
    await cdkCli(
      ['destroy', '--force', '--context', `test-stack-name=${this.stackName}`],
      this.projectDirPath
    ).run();
  };

  abstract assertPostDeployment(): Promise<void>;
}

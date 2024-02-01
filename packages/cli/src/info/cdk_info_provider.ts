import { execa as _execa } from 'execa';
import { format } from '@aws-amplify/cli-core';

/**
 * Provides information about CDK.
 */
export class CdkInfoProvider {
  /**
   * execa to run the cdk command and testing.
   */
  constructor(private readonly execa = _execa) {}

  /**
   * Format CDK information.
   * @returns The cdk doctor output.
   */
  async getCdkInfo(): Promise<string> {
    const cdkDoctorArgs: string[] = ['cdk', 'doctor', '--', ' --no-color'];

    const output = await this.execa('npx', cdkDoctorArgs, {
      all: true,
    });

    return this.formatCdkInfo(output.all ?? output.stderr);
  }

  /**
   * Format CDK information.
   * @param info - The CDK information to format.
   * @returns The formatted CDK information.
   */
  private formatCdkInfo(info: string): string {
    const sensitiveKeys = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_SESSION_TOKEN',
    ];

    const lines = info.split(/\r\n|\r|\n/);
    const formattedLines = lines
      .filter((line) => !sensitiveKeys.some((key) => line.includes(key)))
      .map((line) => {
        //removes emoji from output
        let formattedLine = line.replace(/[^\x20-\x7E]/g, '').trim();

        if (
          formattedLine.startsWith('AWS_') ||
          formattedLine.startsWith('CDK_')
        ) {
          formattedLine = format.indent(formattedLine);
        } else if (formattedLine.startsWith('- ')) {
          formattedLine = format.indent(formattedLine.substring(2));
        }

        return formattedLine;
      });

    return formattedLines
      .filter((line) => !line.startsWith('CDK Version'))
      .join('\n');
  }
}

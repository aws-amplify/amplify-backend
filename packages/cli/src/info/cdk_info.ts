import { execa as _execa } from 'execa';
import { indent } from './indent.js';

/**
 * Provides information about CDK.
 */
export class CdkInfoProvider {
  /**
   * Format CDK information.
   * @param execa - The execa to run the cdk command.
   * @returns The cdk doctor output.
   */
  async getCdkInfo(execa = _execa): Promise<string> {
    const cdkDoctorArgs: string[] = ['cdk', 'doctor', '--', ' --no-color'];

    const output = await execa('npx', cdkDoctorArgs, {
      all: true,
    });

    return output.all ?? output.stderr;
  }

  /**
   * Format CDK information.
   * @param info - The CDK information to format.
   * @returns The formatted CDK information.
   */
  formatCdkInfo(info: string): string {
    const sensitiveKeys = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_SESSION_TOKEN',
    ];

    const lines = info.split(/\r\n|\r|\n/);
    const formattedLines = lines.map((line) => {
      //removes emoji from output
      let formattedLine = line.replace(/[^\x20-\x7E]/g, '').trim();

      const containsSensitiveInfo = sensitiveKeys.some((key) =>
        formattedLine.includes(key)
      );
      if (containsSensitiveInfo) {
        return null;
      }

      if (
        formattedLine.startsWith('AWS_') ||
        formattedLine.startsWith('CDK_')
      ) {
        formattedLine = indent(formattedLine);
      } else if (formattedLine.startsWith('- ')) {
        formattedLine = indent(formattedLine.substring(2));
      }

      return formattedLine;
    });

    return formattedLines
      .filter((line) => line !== null && !line.startsWith('CDK Version'))
      .join('\n');
  }
}

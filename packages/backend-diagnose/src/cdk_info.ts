import * as os from 'node:os';
import { execa as _execa } from 'execa';
import { indent } from './indent.js';

/**
 * Format CDK information.
 * @param execa - The execa to run the cdk command.
 * @returns The cdk doctor output.
 */
export const getCdkInfo = async (execa = _execa): Promise<string> => {
  const cdkDoctorArgs: string[] = ['cdk', 'doctor', '--', ' --no-color'];
  let output;
  try {
    // type-cast the value to string, we know it will be a string given the options
    output = (
      await execa('npx', cdkDoctorArgs, {
        stderr: 'pipe',
      })
    ).stderr;
  } catch (error) {
    // should this be replaced with an AmplifyError
    throw new Error(`Failed to run command: ${error as string}`);
  }
  return output;
};

/**
 * Format CDK information.
 * @param info - The CDK information to format.
 * @returns The formatted CDK information.
 */
export const formatCdkInfo = (info: string) => {
  const sensitiveKeys = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_SESSION_TOKEN',
  ];

  const lines = info.split(os.EOL);
  const formattedLines = lines.map((line) => {
    let formattedLine = line.replace(/[^\x20-\x7E]/g, '').trim();
    const containsSensitiveInfo = sensitiveKeys.some((key) =>
      formattedLine.includes(key)
    );
    if (containsSensitiveInfo) {
      return null;
    }

    if (formattedLine.startsWith('AWS_') || formattedLine.startsWith('CDK_')) {
      formattedLine = indent(formattedLine);
    } else if (formattedLine.startsWith('- ')) {
      formattedLine = indent(formattedLine.substring(2));
    }

    return formattedLine;
  });

  return formattedLines
    .filter((line) => line !== null && !line.startsWith('CDK Version'))
    .join(os.EOL);
};

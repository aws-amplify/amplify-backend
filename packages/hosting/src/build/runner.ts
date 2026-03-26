import { execSync } from 'child_process';
import { AmplifyUserError } from '@aws-amplify/platform-core';

export interface BuildRunnerOptions {
  /**
   * The build command to execute (e.g., 'npm run build').
   */
  command: string;

  /**
   * The working directory for the build command (project root).
   */
  cwd: string;

  /**
   * Optional environment variables to set during the build.
   */
  env?: Record<string, string>;
}

export interface BuildRunnerResult {
  /**
   * The stdout output from the build command.
   */
  stdout: string;

  /**
   * The exit code (always 0 on success since errors throw).
   */
  exitCode: 0;
}

/**
 * Execute a build command as a child process.
 *
 * Runs the user's build command (e.g., 'npm run build') synchronously
 * and returns the output. Throws AmplifyUserError if the command fails.
 */
export const runBuild = (options: BuildRunnerOptions): BuildRunnerResult => {
  const { command, cwd, env } = options;

  try {
    const stdout = execSync(command, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 50 * 1024 * 1024, // 50 MB
    });

    return {
      stdout: stdout ?? '',
      exitCode: 0,
    };
  } catch (error) {
    const execError = error as {
      status?: number;
      stdout?: string;
      stderr?: string;
      message?: string;
    };

    const buildOutput = [
      execError.stdout ?? '',
      execError.stderr ?? '',
    ]
      .filter(Boolean)
      .join('\n');

    throw new AmplifyUserError('BuildError', {
      message: `Build command failed: ${command}`,
      resolution: [
        'Check your build command and fix any errors.',
        'Verify all dependencies are installed (run "npm install").',
        buildOutput
          ? `Build output:\n${buildOutput.slice(-2000)}`
          : 'No build output captured.',
      ].join('\n'),
    });
  }
};

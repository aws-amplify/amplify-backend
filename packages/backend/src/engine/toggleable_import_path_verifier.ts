import { ImportPathVerifier } from '@aws-amplify/plugin-types';
import path from 'path';
import * as os from 'os';
import { extractFilePathFromStackTraceLine } from './extract_file_path_from_stack_trace_line.js';

/**
 * ImportPathVerifier that can be turned into a noop by passing `false` to the constructor
 */
export class ToggleableImportPathVerifier implements ImportPathVerifier {
  /**
   * Defaults to verifying, but can be turned into a noop by passing in false.
   */
  constructor(private readonly doVerify = true) {}

  /**
   * @inheritDoc
   */
  verify = (
    importStack: string | undefined,
    expectedImportingFileBasename: string,
    errorMessage: string
  ): void => {
    if (!this.doVerify) {
      return;
    }
    if (!importStack) {
      return;
    }
    // normalize EOL to \n so that parsing is consistent across platforms
    importStack = importStack.replaceAll(os.EOL, '\n');

    const stacktraceLines =
      importStack
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('at')) || [];
    if (stacktraceLines.length < 2) {
      return;
    }
    const stackTraceImportLine = stacktraceLines[1]; // the first entry is the file where the error was initialized (our code). The second entry is where the customer called our code which is what we are interested in
    const match = stackTraceImportLine.match(extractFilePathFromStackTraceLine);
    if (!match?.groups?.filepath) {
      // don't fail if for some reason we can't parse the stack trace
      return;
    }
    // get just the filename, ie `auth.ts`
    const upstreamFilename = path.basename(match.groups.filepath);
    const allowedFiles = ['ts', 'js', 'mjs', 'cjs', 'mts', 'cts'].map(
      (ext) => `${expectedImportingFileBasename}.${ext}`
    );
    if (!allowedFiles.includes(upstreamFilename)) {
      throw new Error(errorMessage);
    }
  };
}

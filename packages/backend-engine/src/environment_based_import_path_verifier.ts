import { ImportPathVerifier } from '@aws-amplify/plugin-types';
import path from 'path';

/**
 * Inspects Error stacktrace to determine if the Error originated from the expected location
 */
export class EnvironmentBasedImportPathVerifier implements ImportPathVerifier {
  /**
   * Defaults to verifying, but can be turned off by passing in false
   * Also turned off by setting DISABLE_IMPORT_PATH_VERIFICATION environment variable to true
   */
  constructor(
    private readonly doVerify = process.env.DISABLE_IMPORT_PATH_VERIFICATION !==
      'true'
  ) {}

  /**
   * @inheritDoc
   */
  verify(
    importStack: string | undefined,
    expectedImportingFileBasename: string,
    errorMessage: string
  ): void {
    if (!this.doVerify) {
      return;
    }
    if (!importStack) {
      return;
    }
    const stacktraceLines =
      importStack
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('at')) || [];
    if (stacktraceLines.length < 2) {
      return;
    }
    const stackTraceImportLine = stacktraceLines[1]; // the first entry is the file where the error was initialized (our code). The second entry is where the customer called our code which is what we are interested in
    // the line is something like `at <anonymous> (/some/path/to/project/root/backend/auth.ts:3:21)`
    // this regex pulls out the file path, ie `/some/path/to/project/root/backend/auth.ts`
    const extractFilePathFromStackTraceLine = /\((?<filepath>[^:]*):.*\)/;
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
  }
}

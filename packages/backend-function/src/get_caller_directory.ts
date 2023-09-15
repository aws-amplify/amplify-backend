import path from 'path';
import * as os from 'os';

/**
 * Extracts the path of the caller of the code that generated the input stack trace.
 * In other words, extracts the path from the _second_ entry in the stack trace
 * (the first entry being the location where the stack trace was created and the second entry being the location that called the code that generated the stack trace)
 */
export const getCallerDirectory = (stackTrace?: string): string => {
  const unresolvedImportLocationError = new Error(
    'Could not determine import path to construct absolute code path from relative path. Consider using an absolute path instead.'
  );
  if (!stackTrace) {
    throw unresolvedImportLocationError;
  }
  const stacktraceLines =
    stackTrace
      .split(os.EOL)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('at')) || [];
  if (stacktraceLines.length < 2) {
    throw unresolvedImportLocationError;
  }
  const stackTraceImportLine = stacktraceLines[1]; // the first entry is the file where the error was initialized (our code). The second entry is where the customer called our code which is what we are interested in
  // the line is something like `at <anonymous> (/some/path/to/file.ts:3:21)`
  // this regex pulls out the file path, ie `/some/path/to/file.ts`
  const extractFilePathFromStackTraceLine =
    /\((?<filepath>(\w:)?[^:]*)[:\d]*\)/;
  const match = stackTraceImportLine.match(extractFilePathFromStackTraceLine);
  if (!match?.groups?.filepath) {
    throw unresolvedImportLocationError;
  }
  return path.dirname(match.groups.filepath);
};

import path from 'path';
import * as os from 'os';
import { FilePathExtractor } from '@aws-amplify/platform-core';

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
  // normalize EOL to \n so that parsing is consistent across platforms
  stackTrace = stackTrace.replaceAll(os.EOL, '\n');
  const stacktraceLines =
    stackTrace
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('at')) || [];
  if (stacktraceLines.length < 2) {
    throw unresolvedImportLocationError;
  }
  const stackTraceImportLine = stacktraceLines[1]; // the first entry is the file where the error was initialized (our code). The second entry is where the customer called our code which is what we are interested in

  const filePath = new FilePathExtractor(stackTraceImportLine).extract();
  if (filePath) {
    return path.dirname(filePath);
  }
  throw unresolvedImportLocationError;
};

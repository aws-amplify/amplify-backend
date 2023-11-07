import path from 'path';
import * as os from 'os';
import { extractFilePathFromStackTraceLineRegexes } from '@aws-amplify/platform-core';
import { fileURLToPath } from 'url';

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

  for (const regex of extractFilePathFromStackTraceLineRegexes) {
    const match = stackTraceImportLine.match(regex);
    if (match?.groups?.filepath) {
      const filePath = standardizePath(match?.groups?.filepath);
      return path.dirname(filePath);
    }
  }
  throw unresolvedImportLocationError;
};

// The input can be either a file path or a file URL. If it's a file URL, convert it to the path.
const standardizePath = (maybeUrl: string): string => {
  try {
    const url = new URL(maybeUrl);
    if (url.protocol === 'file:') {
      return fileURLToPath(url);
    }
    return maybeUrl;
  } catch {
    return maybeUrl;
  }
};

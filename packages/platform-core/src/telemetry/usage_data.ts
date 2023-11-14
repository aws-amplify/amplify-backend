import path from 'path';

const stackTraceRegex =
  /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
const ARNRegex =
  /arn:[a-z0-9][-.a-z0-9]{0,62}:[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}/g;

/**
 * Wrapper around Error.name
 */
export class SerializableError {
  name: string;
  message: string;
  details?: string;
  code?: string;
  trace?: Trace[];
  /**
   * constructor for SerializableError
   */
  constructor(error: Error) {
    this.name = error.name;
    this.message = sanitize(removeARN(error.message));
    this.details =
      'details' in error
        ? sanitize(removeARN(error.details as string))
        : undefined;
    this.code =
      'code' in error ? sanitize(removeARN(error.code as string)) : undefined;
    this.trace = extractStackTrace(error);
  }
}

const extractStackTrace = (error: Error): Trace[] => {
  const result: Trace[] = [];
  if (error.stack) {
    const stack = error.stack.split('\n');
    stack.forEach((line) => {
      const match = stackTraceRegex.exec(line);
      if (match) {
        const [, methodName, file, lineNumber, columnNumber] = match;
        result.push({
          methodName,
          file,
          lineNumber,
          columnNumber,
        });
      }
    });
    const processedPaths = processPaths(result.map((trace) => trace.file));
    result.forEach((trace, index) => {
      // eslint-disable-next-line no-param-reassign
      trace.file = processedPaths[index];
    });
  }
  return result;
};

type Trace = {
  methodName: string;
  file: string;
  lineNumber: string;
  columnNumber: string;
};

const removeARN = (str?: string): string => {
  return str?.replace(ARNRegex, '<escaped ARN>') ?? '';
};

const sanitize = (str: string) => {
  return str.replaceAll(/["❌]/g, '');
};

const processPaths = (paths: string[]): string[] => {
  const result = [...paths];
  if (paths.length === 0) {
    return result;
  }
  const longestString = paths.reduce((a, b) => (a.length > b.length ? a : b));
  const directoriesToRemove = longestString.split('/');
  const directoriesRemoved: Array<string> = [];
  for (const directory of directoriesToRemove) {
    if (directory === '') {
      continue;
    }
    let removedInAnyPath = false;
    for (let i = 0; i < result.length; i++) {
      if (
        result[i].startsWith(`/${directory}`) &&
        result[i] !== longestString
      ) {
        result[i] = result[i].replace(`/${directory}`, '');
        removedInAnyPath = true;
      }
    }
    if (removedInAnyPath) {
      directoriesRemoved.push(directory);
    } else {
      // if current segment is not in any path this means we removed common prefix from all paths.
      break;
    }
  }

  return result.map((r) => {
    if (r === longestString && directoriesRemoved.length > 0) {
      return longestString.replace(path.join(...directoriesRemoved), '');
    }
    return r;
  });
};

export type UsageData = {
  sessionUuid: string;
  installationUuid: string;
  amplifyCliVersion: string;
  timestamp: string;
  error: SerializableError | undefined;
  downstreamException: SerializableError | undefined;
  payloadVersion: string;
  osPlatform: string;
  osRelease: string;
  nodeVersion: string;
  state: string;
  isCi: boolean;
  accountId: string;
};

export type DeploymentTimes = {
  synthesisTime?: number;
  totalTime?: number;
};

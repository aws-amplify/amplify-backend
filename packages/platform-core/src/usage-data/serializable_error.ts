import path from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

/**
 * Wrapper around Error for serialization for usage metrics
 */
export class SerializableError {
  name: string;
  message: string;
  details?: string;
  trace?: Trace[];

  // breakdown of filePathRegex:
  // (file:/+)? -> matches optional file url prefix
  // homedir()/process.cwd() -> users home directory or current working directory, replacing \ with /
  // [\\w.\\-_@\\\\/]+ -> matches nested directories and file name
  private filePathRegex = new RegExp(
    `(file:/+)?(${homedir().replaceAll('\\', '/')}|${process.cwd().replaceAll('\\', '/')})[\\w.\\-_@\\\\/]+`,
    'g',
  );
  private stackTraceRegex =
    /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
  private arnRegex =
    /arn:[a-z0-9][-.a-z0-9]{0,62}:[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}/g;
  private stackRegex = /amplify-[a-zA-Z0-9-]+/g;
  /**
   * constructor for SerializableError
   */
  constructor(error: Error) {
    this.name =
      'code' in error && error.code
        ? this.sanitize(error.code as string)
        : error.name;
    this.message = this.anonymizePaths(this.sanitize(error.message));
    this.details =
      'details' in error
        ? this.anonymizePaths(this.sanitize(error.details as string))
        : undefined;
    this.trace = this.extractStackTrace(error);
  }

  private extractStackTrace = (error: Error): Trace[] => {
    const result: Trace[] = [];
    if (error.stack) {
      const stack = error.stack.split('\n');
      stack.forEach((line) => {
        const match = this.stackTraceRegex.exec(line);
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
      const processedPaths = this.processPaths(
        result.map((trace) => trace.file),
      );
      result.forEach((trace, index) => {
        trace.file = processedPaths[index];
      });
    }
    return result;
  };

  private anonymizePaths = (str: string): string => {
    let result = str;
    const matches = [...result.matchAll(this.filePathRegex)];
    for (const match of matches) {
      result = result.replace(match[0], this.processPaths([match[0]])[0]);
    }

    return result;
  };

  private processPaths = (paths: string[]): string[] => {
    return paths.map((tracePath) => {
      let result = tracePath;
      if (this.isURLFilePath(result)) {
        result = fileURLToPath(result);
      }
      if (path.isAbsolute(result)) {
        return path.relative(process.cwd(), result);
      }

      return result;
    });
  };

  private removeARN = (str?: string): string => {
    return str?.replace(this.arnRegex, '<escaped ARN>') ?? '';
  };

  private removeStackIdentifier = (str?: string): string => {
    return str?.replace(this.stackRegex, '<escaped stack>') ?? '';
  };

  private sanitize = (str: string) => {
    let result = str;
    result = this.removeARN(result);
    result = this.removeStackIdentifier(result);
    return result.replaceAll(/["❌]/g, '');
  };

  private isURLFilePath = (path: string): boolean => {
    try {
      new URL(path);
      return path.startsWith('file:');
    } catch {
      return false;
    }
  };
}

type Trace = {
  methodName: string;
  file: string;
  lineNumber: string;
  columnNumber: string;
};

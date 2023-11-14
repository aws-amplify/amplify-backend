import path from 'path';

/**
 * Wrapper around Error for easy serialization for usage metrics
 */
export class SerializableError {
  stackTraceRegex =
    /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;
  arnRegex =
    /arn:[a-z0-9][-.a-z0-9]{0,62}:[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}/g;

  name: string;
  message: string;
  details?: string;
  trace?: Trace[];

  /**
   * constructor for SerializableError
   */
  constructor(error: Error) {
    this.name =
      'code' in error ? this.sanitize(error.code as string) : error.name;
    this.message = this.sanitize(error.message);
    this.details =
      'details' in error ? this.sanitize(error.details as string) : undefined;
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
        result.map((trace) => trace.file)
      );
      result.forEach((trace, index) => {
        trace.file = processedPaths[index];
      });
    }
    return result;
  };

  private processPaths = (paths: string[]): string[] => {
    return paths.map((tracePath) => {
      if (path.isAbsolute(tracePath)) {
        return path.relative(process.cwd(), tracePath);
      }
      return tracePath;
    });
  };

  private removeARN = (str?: string): string => {
    return str?.replace(this.arnRegex, '<escaped ARN>') ?? '';
  };

  private sanitize = (str: string) => {
    return this.removeARN(str)?.replaceAll(/["❌]/g, '');
  };
}

type Trace = {
  methodName: string;
  file: string;
  lineNumber: string;
  columnNumber: string;
};

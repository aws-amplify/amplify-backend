const arnRegex =
  /arn:[a-z0-9][-.a-z0-9]{0,62}:[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}/g;
const stackRegex = /amplify-[a-zA-Z0-9-]+/g;

/**
 * Wrapper around Error for serialization for usage metrics.
 *
 * Only the error name (or code, when available) is included.
 * Free-form text such as the error message, details and stack trace is purposely omitted.
 */
export class SerializableError {
  name: string;

  /**
   * constructor for SerializableError
   */
  constructor(error: Error) {
    this.name =
      'code' in error && error.code
        ? sanitize(error.code as string)
        : error.name;
  }
}

const sanitize = (str: string): string => {
  return str
    .replace(arnRegex, '<escaped ARN>')
    .replace(stackRegex, '<escaped stack>')
    .replaceAll(/["❌]/g, '');
};

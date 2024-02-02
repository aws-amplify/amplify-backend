import fs from 'fs';

/**
 * Generates a type definition file for environment variables
 */
export class FunctionEnvironmentTypeGenerator {
  /**
   * Lambda runtime environment variables and their descriptions.
   * See https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime
   */
  private staticEnvironmentVariables: Record<string, string> = {
    // reserved environment variables
    _HANDLER: 'The handler location configured on the function.',
    _X_AMZN_TRACE_ID:
      'The X-Ray tracing header. This environment variable changes with each invocation.',
    AWS_DEFAULT_REGION:
      'The default AWS Region where the Lambda function is executed.',
    AWS_REGION:
      'The AWS Region where the Lambda function is executed. If defined, this value overrides the AWS_DEFAULT_REGION.',
    AWS_EXECUTION_ENV:
      'The runtime identifier, prefixed by AWS_Lambda_ (for example, AWS_Lambda_java8).',
    AWS_LAMBDA_FUNCTION_NAME: 'The name of the function.',
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE:
      'The amount of memory available to the function in MB.',
    AWS_LAMBDA_FUNCTION_VERSION: 'The version of the function being executed.',
    AWS_LAMBDA_INITIALIZATION_TYPE:
      'The initialization type of the function, which is on-demand, provisioned-concurrency, or snap-start.',
    AWS_LAMBDA_LOG_GROUP_NAME:
      'The name of the Amazon CloudWatch Logs group for the function.',
    AWS_LAMBDA_LOG_STREAM_NAME:
      'The name of the Amazon CloudWatch Logs stream for the function.',
    AWS_ACCESS_KEY: `AWS access key.`,
    AWS_ACCESS_KEY_ID: `AWS access key ID.`,
    AWS_SECRET_ACCESS_KEY: `AWS secret access key.`,
    AWS_SESSION_TOKEN: `AWS Session token.`,
    AWS_LAMBDA_RUNTIME_API: 'The host and port of the runtime API.',
    LAMBDA_TASK_ROOT: 'The path to your Lambda function code.',
    LAMBDA_RUNTIME_DIR: 'The path to runtime libraries.',
    // unreserved environment variables
    LANG: 'The locale of the runtime.',
    PATH: 'The execution path.',
    LD_LIBRARY_PATH: 'The system library path.',
    NODE_PATH: 'The Node.js library path.',
    PYTHONPATH: 'The Python library path.',
    GEM_PATH: 'The Ruby library path.',
    AWS_XRAY_CONTEXT_MISSING:
      'For X-Ray tracing, Lambda sets this to LOG_ERROR to avoid throwing runtime errors from the X-Ray SDK.',
    AWS_XRAY_DAEMON_ADDRESS:
      'For X-Ray tracing, the IP address and port of the X-Ray daemon.',
    AWS_LAMBDA_DOTNET_PREJIT:
      'For the .NET 6 and .NET 7 runtimes, set this variable to enable or disable .NET specific runtime optimizations.',
    TZ: `The environment's time zone.`,
  };

  private typeDefLocation: string;

  private typeDefFileName: string;

  /**
   * Initialize type definition file name and location
   */
  constructor(functionName: string, functionEntryPath: string) {
    this.typeDefFileName = `${functionName}_env.ts`;
    this.typeDefLocation = functionEntryPath.substring(
      0,
      functionEntryPath.lastIndexOf('/')
    );
  }

  /**
   * Generate a type definition file `./amplify/<function-name>_env.ts` as a sibling to the function's entry file
   */
  generateTypeDefFile() {
    const dir = `${this.typeDefLocation}/amplify/`;
    const declarations = [];

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    for (const key in this.staticEnvironmentVariables) {
      const comment = `/** ${this.staticEnvironmentVariables[key]} */`;
      const declaration = `${key}: string;`;

      declarations.push(`${comment}\n${declaration}`);
    }

    const content =
      'export const env = process.env as {\n' +
      declarations.join('\n\n') +
      '\n};';

    fs.writeFileSync(dir + this.typeDefFileName, content);
  }
}

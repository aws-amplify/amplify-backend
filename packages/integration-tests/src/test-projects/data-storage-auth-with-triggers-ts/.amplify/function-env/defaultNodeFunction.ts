/**
 * This file is here to make Typescript happy for initial type checking and will be overwritten when tests run
 */
/** Lambda runtime environment variables, see https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime */
export const env = process.env as LambdaProvidedEnvVars & DefinedEnvVars;

type LambdaProvidedEnvVars = {
  /** The handler location configured on the function. */
  _HANDLER: string;

  /** The X-Ray tracing header. This environment variable changes with each invocation. */
  _X_AMZN_TRACE_ID: string;

  /** The default AWS Region where the Lambda function is executed. */
  AWS_DEFAULT_REGION: string;

  /** The AWS Region where the Lambda function is executed. If defined, this value overrides the AWS_DEFAULT_REGION. */
  AWS_REGION: string;

  /** The runtime identifier, prefixed by AWS_Lambda_ (for example, AWS_Lambda_java8). */
  AWS_EXECUTION_ENV: string;

  /** The name of the function. */
  AWS_LAMBDA_FUNCTION_NAME: string;

  /** The amount of memory available to the function in MB. */
  AWS_LAMBDA_FUNCTION_MEMORY_SIZE: string;

  /** The version of the function being executed. */
  AWS_LAMBDA_FUNCTION_VERSION: string;

  /** The initialization type of the function, which is on-demand, provisioned-concurrency, or snap-start. */
  AWS_LAMBDA_INITIALIZATION_TYPE: string;

  /** The name of the Amazon CloudWatch Logs group for the function. */
  AWS_LAMBDA_LOG_GROUP_NAME: string;

  /** The name of the Amazon CloudWatch Logs stream for the function. */
  AWS_LAMBDA_LOG_STREAM_NAME: string;

  /** AWS access key. */
  AWS_ACCESS_KEY: string;

  /** AWS access key ID. */
  AWS_ACCESS_KEY_ID: string;

  /** AWS secret access key. */
  AWS_SECRET_ACCESS_KEY: string;

  /** AWS Session token. */
  AWS_SESSION_TOKEN: string;

  /** The host and port of the runtime API. */
  AWS_LAMBDA_RUNTIME_API: string;

  /** The path to your Lambda function code. */
  LAMBDA_TASK_ROOT: string;

  /** The path to runtime libraries. */
  LAMBDA_RUNTIME_DIR: string;

  /** The locale of the runtime. */
  LANG: string;

  /** The execution path. */
  PATH: string;

  /** The system library path. */
  LD_LIBRARY_PATH: string;

  /** The Node.js library path. */
  NODE_PATH: string;

  /** For X-Ray tracing, Lambda sets this to LOG_ERROR to avoid throwing runtime errors from the X-Ray SDK. */
  AWS_XRAY_CONTEXT_MISSING: string;

  /** For X-Ray tracing, the IP address and port of the X-Ray daemon. */
  AWS_XRAY_DAEMON_ADDRESS: string;

  /** The environment's time zone. */
  TZ: string;
};

type DefinedEnvVars = {
  TEST_SECRET: string;
  TEST_SHARED_SECRET: string;
};

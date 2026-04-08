import { Construct } from 'constructs';
import { Duration, Stack, Token } from 'aws-cdk-lib';
import {
  Architecture,
  Code,
  FunctionUrl,
  FunctionUrlAuthType,
  InvokeMode,
  Function as LambdaFunction,
  LayerVersion,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { HostingError } from '../hosting_error.js';
import { ComputeResource } from '../manifest/types.js';
import { SSR_DEFAULT_PORT } from '../defaults.js';

// ---- Constants ----

/**
 * Account ID for the public Lambda Web Adapter layer.
 * Maintained by AWS Labs: https://github.com/awslabs/aws-lambda-web-adapter
 */
const LAMBDA_WEB_ADAPTER_ACCOUNT = '753240598075';

/**
 * Layer name for the Lambda Web Adapter (x86-64).
 */
const LAMBDA_WEB_ADAPTER_LAYER_NAME = 'LambdaAdapterLayerX86';

/**
 * Default Lambda Web Adapter layer version.
 */
const DEFAULT_WEB_ADAPTER_VERSION = 22;

/** Default Lambda memory in MB */
const DEFAULT_LAMBDA_MEMORY_MB = 512;

/** Default Lambda timeout in seconds */
const DEFAULT_LAMBDA_TIMEOUT_SECONDS = 30;

/**
 * Regions known to host the Lambda Web Adapter public layer.
 * Source: https://github.com/awslabs/aws-lambda-web-adapter
 * This list may need updating as new regions are added.
 */
const LAMBDA_WEB_ADAPTER_SUPPORTED_REGIONS = new Set([
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-north-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-south-1',
  'sa-east-1',
  'ca-central-1',
  'me-south-1',
  'af-south-1',
  'eu-south-1',
]);

// ---- Public types ----

/**
 * Props for the ComputeConstruct.
 */
export type ComputeConstructProps = {
  /** The compute resource definition from the deploy manifest. */
  computeResource: ComputeResource;
  /** Filesystem path to the directory containing compute resource subdirectories. */
  computeBasePath: string;
  /** The hosting S3 bucket. Reserved for future use (e.g. granting Lambda read access to assets). */
  bucket: IBucket;
  /** Lambda memory size in MB. Default: 512. */
  memorySize?: number;
  /** Lambda timeout. Default: 30 seconds. */
  timeout?: Duration;
  /** Reserved concurrent executions. Default: undefined (no reservation). */
  reservedConcurrency?: number;
  /** Lambda Web Adapter layer version. Default: 22. */
  webAdapterVersion?: number;
  /** CloudWatch log retention. Default: TWO_WEEKS. */
  logRetention?: RetentionDays;
  /**
   * Skip the Lambda Web Adapter region validation check.
   * Use when deploying to a newly-launched region that supports the
   * adapter but is not yet in the built-in allowlist.
   */
  skipRegionValidation?: boolean;
};

// ---- Construct ----

/**
 * Lambda compute for SSR: creates a Lambda function with the AWS Lambda
 * Web Adapter layer, a Function URL with IAM auth + RESPONSE_STREAM,
 * and a least-privilege IAM role.
 */
export class ComputeConstruct extends Construct {
  readonly function: LambdaFunction;
  readonly functionUrl: FunctionUrl;

  /**
   * Create an SSR compute function with the given props.
   */
  constructor(scope: Construct, id: string, props: ComputeConstructProps) {
    super(scope, id);

    const region = Stack.of(this).region;
    const computeDir = `${props.computeBasePath}/${props.computeResource.name}`;
    const webAdapterVersion =
      props.webAdapterVersion ?? DEFAULT_WEB_ADAPTER_VERSION;

    // Validate region supports Lambda Web Adapter (skip if region is an
    // unresolved token or if the caller opted out via skipRegionValidation)
    if (
      !props.skipRegionValidation &&
      !Token.isUnresolved(region) &&
      !LAMBDA_WEB_ADAPTER_SUPPORTED_REGIONS.has(region)
    ) {
      throw new HostingError('UnsupportedRegionError', {
        message: `Lambda Web Adapter layer is not available in region '${region}'.`,
        resolution:
          'SSR hosting requires a supported region. ' +
          'See https://github.com/awslabs/aws-lambda-web-adapter for supported regions.',
      });
    }

    const webAdapterLayerArn = `arn:aws:lambda:${region}:${LAMBDA_WEB_ADAPTER_ACCOUNT}:layer:${LAMBDA_WEB_ADAPTER_LAYER_NAME}:${webAdapterVersion}`;

    // Explicit least-privilege role — only CloudWatch Logs
    const ssrRole = new Role(this, 'SsrFunctionRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    });

    this.function = new LambdaFunction(this, 'SsrFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'run.sh', // Lambda Web Adapter's /opt/bootstrap executes this as the server entrypoint
      code: Code.fromAsset(computeDir),
      architecture: Architecture.X86_64,
      memorySize: props.memorySize ?? DEFAULT_LAMBDA_MEMORY_MB,
      timeout:
        props.timeout ?? Duration.seconds(DEFAULT_LAMBDA_TIMEOUT_SECONDS),
      reservedConcurrentExecutions: props.reservedConcurrency,
      role: ssrRole,
      logRetention: props.logRetention ?? RetentionDays.TWO_WEEKS,
      layers: [
        LayerVersion.fromLayerVersionArn(
          this,
          'WebAdapterLayer',
          webAdapterLayerArn,
        ),
      ],
      environment: {
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        AWS_LWA_INVOKE_MODE: 'response_stream',
        PORT: String(SSR_DEFAULT_PORT),
      },
    });

    this.functionUrl = this.function.addFunctionUrl({
      authType: FunctionUrlAuthType.AWS_IAM,
      invokeMode: InvokeMode.RESPONSE_STREAM,
    });
  }
}

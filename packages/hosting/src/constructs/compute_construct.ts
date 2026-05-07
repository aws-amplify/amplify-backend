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
  /** Logical name of this compute resource. */
  name: string;
  /** The compute resource definition from the deploy manifest. */
  computeResource: ComputeResource;
  /** Lambda memory size override (MB). Default: from manifest or 512. */
  memorySize?: number;
  /** Lambda timeout override. Default: from manifest or 30 seconds. */
  timeout?: Duration;
  /** Reserved concurrent executions. Default: undefined (no reservation). */
  reservedConcurrency?: number;
  /** Lambda Web Adapter layer version. Default: 22. */
  webAdapterVersion?: number;
  /** CloudWatch log retention. Default: TWO_WEEKS. */
  logRetention?: RetentionDays;
  /** Skip the Lambda Web Adapter region validation check. */
  skipRegionValidation?: boolean;
};

// ---- Construct ----

/**
 * Lambda compute construct — creates Lambda functions from manifest compute resources.
 *
 * Supports three compute types:
 * - **handler**: Direct Lambda invocation (native Node.js handler, no Web Adapter).
 *   Used by OpenNext server functions.
 * - **http-server**: Lambda + Web Adapter layer. Runs an HTTP server process inside Lambda.
 *   Used for frameworks that produce HTTP servers (SvelteKit, Astro, custom servers).
 * - **edge**: Lambda@Edge (placeholder — deployed via CloudFront).
 */
export class ComputeConstruct extends Construct {
  readonly function: LambdaFunction;
  readonly functionUrl!: FunctionUrl;

  /**
   * Creates a compute resource (Lambda function) based on the compute type.
   */
  constructor(scope: Construct, id: string, props: ComputeConstructProps) {
    super(scope, id);

    const { computeResource } = props;
    const region = Stack.of(this).region;

    const memorySize =
      props.memorySize ??
      computeResource.memorySize ??
      DEFAULT_LAMBDA_MEMORY_MB;
    const timeout =
      props.timeout ??
      Duration.seconds(
        computeResource.timeout ?? DEFAULT_LAMBDA_TIMEOUT_SECONDS,
      );

    // Explicit least-privilege role — only CloudWatch Logs
    const ssrRole = new Role(this, 'FunctionRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    });

    if (computeResource.type === 'handler') {
      // Native Lambda handler — no Web Adapter needed
      this.function = new LambdaFunction(this, 'Function', {
        runtime: this.resolveRuntime(computeResource.runtime),
        handler: computeResource.handler ?? 'index.handler',
        code: Code.fromAsset(computeResource.bundle),
        architecture: Architecture.X86_64,
        memorySize,
        timeout,
        reservedConcurrentExecutions: props.reservedConcurrency,
        role: ssrRole,
        logRetention: props.logRetention ?? RetentionDays.TWO_WEEKS,
        environment: {
          ...computeResource.environment,
        },
      });
    } else if (computeResource.type === 'http-server') {
      // HTTP server mode — Lambda Web Adapter proxies HTTP traffic
      this.validateWebAdapterRegion(region, props.skipRegionValidation);

      const webAdapterVersion =
        props.webAdapterVersion ?? DEFAULT_WEB_ADAPTER_VERSION;
      const webAdapterLayerArn = `arn:aws:lambda:${region}:${LAMBDA_WEB_ADAPTER_ACCOUNT}:layer:${LAMBDA_WEB_ADAPTER_LAYER_NAME}:${webAdapterVersion}`;
      const port = computeResource.port ?? SSR_DEFAULT_PORT;

      this.function = new LambdaFunction(this, 'Function', {
        runtime: this.resolveRuntime(computeResource.runtime),
        handler: computeResource.entrypoint ?? 'run.sh',
        code: Code.fromAsset(computeResource.bundle),
        architecture: Architecture.X86_64,
        memorySize,
        timeout,
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
          PORT: String(port),
          ...computeResource.environment,
        },
      });
    } else if (computeResource.type === 'edge') {
      // Edge function — Lambda@Edge does not support env vars or Function URLs
      if (
        computeResource.environment &&
        Object.keys(computeResource.environment).length > 0
      ) {
        process.stderr.write(
          `⚠️  Edge compute '${props.name}' has environment variables which Lambda@Edge does not support. They will be stripped.\n`,
        );
      }
      this.function = new LambdaFunction(this, 'Function', {
        runtime: this.resolveRuntime(computeResource.runtime),
        handler: computeResource.handler ?? 'index.handler',
        code: Code.fromAsset(computeResource.bundle),
        architecture: Architecture.X86_64,
        memorySize,
        timeout: Duration.seconds(Math.min(computeResource.timeout ?? 5, 30)),
        role: ssrRole,
        logRetention: props.logRetention ?? RetentionDays.TWO_WEEKS,
      });
    } else {
      throw new HostingError('UnsupportedComputeTypeError', {
        message: `Unsupported compute type: "${String(computeResource.type)}"`,
        resolution:
          'Use a supported compute type: handler, http-server, or edge.',
      });
    }

    // Function URL for handler and http-server types (edge functions don't support this)
    if (computeResource.type !== 'edge') {
      const invokeMode =
        computeResource.streaming !== false
          ? InvokeMode.RESPONSE_STREAM
          : InvokeMode.BUFFERED;

      this.functionUrl = this.function.addFunctionUrl({
        authType: FunctionUrlAuthType.AWS_IAM,
        invokeMode,
      });
    }
  }

  private resolveRuntime(runtime?: string): Runtime {
    if (!runtime || runtime === 'nodejs20.x') {
      return Runtime.NODEJS_20_X;
    }
    if (runtime === 'nodejs22.x') {
      return Runtime.NODEJS_22_X;
    }
    if (runtime === 'nodejs18.x') {
      return Runtime.NODEJS_18_X;
    }
    return Runtime.NODEJS_20_X;
  }

  private validateWebAdapterRegion(
    region: string,
    skipValidation?: boolean,
  ): void {
    if (
      !skipValidation &&
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
  }
}

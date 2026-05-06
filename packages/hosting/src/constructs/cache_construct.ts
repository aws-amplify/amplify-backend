import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import {
  AttributeType,
  BillingMode,
  Table,
  TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { CacheConfig } from '../manifest/deploy_manifest.js';

// ---- Public types ----

/**
 * Props for the CacheConstruct.
 *
 * @param cacheConfig - Cache configuration from the deploy manifest v2.
 * @param ssrFunction - The SSR Lambda function that needs cache access.
 *   When provided, the construct grants read/write permissions and injects
 *   environment variables (CACHE_BUCKET_NAME, CACHE_TABLE_NAME).
 * @param retainOnDelete - If true, cache resources are retained on stack deletion.
 */
export type CacheConstructProps = {
  /** Cache configuration from the deploy manifest v2. */
  cacheConfig: CacheConfig;
  /** The SSR Lambda function that needs cache access. */
  ssrFunction?: LambdaFunction;
  /** If true, cache resources are retained on stack deletion. Default: false. */
  retainOnDelete?: boolean;
};

// ---- Construct ----

/**
 * Infrastructure for ISR caching: S3 bucket for page/data cache storage
 * and DynamoDB table for cache tag tracking and invalidation.
 *
 * This construct is provisioned only when the deploy manifest declares
 * `cache.enabled: true` (typically because ISR routes exist).
 *
 * Resources created:
 * - S3 bucket: Stores cached page HTML and data responses
 * - DynamoDB table: Maps cache tags to keys for on-demand revalidation
 *
 * The construct grants the SSR Lambda function read/write access to both
 * resources and injects connection details via environment variables.
 */
export class CacheConstruct extends Construct {
  readonly cacheBucket: Bucket;
  readonly cacheTagTable: Table;

  /**
   * Create cache infrastructure with the given configuration.
   */
  constructor(scope: Construct, id: string, props: CacheConstructProps) {
    super(scope, id);

    const { cacheConfig, ssrFunction, retainOnDelete = false } = props;
    const storage = cacheConfig.storage ?? 's3+dynamodb';
    const tagTracking = cacheConfig.tagTracking ?? true;

    // ---- S3 Cache Bucket ----
    // Stores full cached responses (HTML pages, JSON data) keyed by route path.
    // Objects include metadata for revalidation time and associated tags.
    this.cacheBucket = new Bucket(this, 'CacheBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      enforceSSL: true,
      versioned: false,
      removalPolicy: retainOnDelete
        ? RemovalPolicy.RETAIN
        : RemovalPolicy.DESTROY,
      autoDeleteObjects: !retainOnDelete,
    });

    // ---- DynamoDB Cache Tag Table ----
    // Schema: PK = tag (string), SK = cacheKey (string)
    // Used for on-demand revalidation: revalidateTag("blog") queries all keys
    // with that tag and marks them stale.
    // Additional attribute: staleSince (number, epoch seconds) — set when tag is invalidated.
    this.cacheTagTable = new Table(this, 'CacheTagTable', {
      partitionKey: { name: 'tag', type: AttributeType.STRING },
      sortKey: { name: 'cacheKey', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.DEFAULT,
      removalPolicy: retainOnDelete
        ? RemovalPolicy.RETAIN
        : RemovalPolicy.DESTROY,
      pointInTimeRecovery: false,
    });

    // ---- Grant Lambda access and inject env vars ----
    if (ssrFunction) {
      if (storage === 's3' || storage === 's3+dynamodb') {
        this.cacheBucket.grantReadWrite(ssrFunction);
      }

      if (
        tagTracking &&
        (storage === 'dynamodb' || storage === 's3+dynamodb')
      ) {
        this.cacheTagTable.grantReadWriteData(ssrFunction);
      }

      ssrFunction.addEnvironment(
        'CACHE_BUCKET_NAME',
        this.cacheBucket.bucketName,
      );
      ssrFunction.addEnvironment(
        'CACHE_TABLE_NAME',
        this.cacheTagTable.tableName,
      );
    }
  }
}

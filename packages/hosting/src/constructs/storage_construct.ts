import { Construct } from 'constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  ObjectOwnership,
} from 'aws-cdk-lib/aws-s3';

// ---- Constants ----

/** Retain build artifacts for 1 year to support rollback scenarios */
const DEFAULT_BUILD_RETENTION_DAYS = 365;

/** Default retention for access logs */
const DEFAULT_ACCESS_LOG_RETENTION_DAYS = 90;

// ---- Public types ----

/**
 * Props for the StorageConstruct.
 */
export type StorageConstructProps = {
  /** If true, the S3 bucket is retained on stack deletion. Default: false. */
  retainOnDelete?: boolean;
  /** Enable CloudFront access logging to a dedicated S3 bucket. Default: false. */
  accessLogging?: boolean;
};

// ---- Construct ----

/**
 * S3 storage for hosting assets: the primary hosting bucket and an optional
 * access log bucket.
 *
 * The hosting bucket is private (BLOCK_ALL), versioned, encrypted with
 * S3-managed keys, and enforces SSL. Lifecycle rules expire old builds
 * and noncurrent versions automatically.
 */
export class StorageConstruct extends Construct {
  readonly bucket: Bucket;
  readonly accessLogBucket?: Bucket;

  /**
   * Create hosting storage with the given props.
   */
  constructor(scope: Construct, id: string, props: StorageConstructProps = {}) {
    super(scope, id);

    const retainOnDelete = props.retainOnDelete ?? false;

    this.bucket = new Bucket(this, 'HostingBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: retainOnDelete
        ? RemovalPolicy.RETAIN
        : RemovalPolicy.DESTROY,
      autoDeleteObjects: !retainOnDelete,
      lifecycleRules: [
        {
          id: 'DeleteOldBuilds',
          prefix: 'builds/',
          expiration: Duration.days(DEFAULT_BUILD_RETENTION_DAYS),
          enabled: true,
        },
        {
          id: 'ExpireNoncurrentVersions',
          noncurrentVersionExpiration: Duration.days(30),
          enabled: true,
        },
      ],
    });

    if (props.accessLogging) {
      /* eslint-disable spellcheck/spell-checker */
      // CloudFront standard logging requires ACL-based writes via the
      // awslogsdelivery canonical user. BUCKET_OWNER_ENFORCED disables ACLs
      // entirely, which would silently prevent log delivery. The hosting
      // bucket uses BUCKET_OWNER_ENFORCED (modern default) but the access
      // log bucket must use BUCKET_OWNER_PREFERRED to support CloudFront logging.
      /* eslint-enable spellcheck/spell-checker */
      this.accessLogBucket = new Bucket(this, 'AccessLogBucket', {
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        encryption: BucketEncryption.S3_MANAGED,
        objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        lifecycleRules: [
          {
            id: 'ExpireAccessLogs',
            expiration: Duration.days(DEFAULT_ACCESS_LOG_RETENTION_DAYS),
            enabled: true,
          },
        ],
      });
    }
  }
}

import { RemovalPolicy } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

const MODEL_INTROSPECTION_SCHEMA_KEY = 'model-introspection-schema.graphql';
const DATASTORE_SCHEMA_KEY = 'schema.js';

/**
 * Props for the AmplifyCMS construct.
 */
export type AmplifyCMSProps = {
  /**
   * The model introspection schema used in CMS.
   */
  readonly modelIntrospectionSchema: string;

  /**
   * The JS Datastore schema.js file contents.
   */
  readonly datastoreSchema: string;
};

/**
 * Construct which creates a bucket, and uploads file assets required for CMS to operate.
 * Pointers to these resources are persisted in the stack outputs.
 */
export class AmplifyCMS extends Construct {
  /**
   * Initialize the Assets and bucket required for CMS.
   * @param scope construct scope
   * @param id construct id
   * @param props construct props
   */
  constructor(scope: Construct, id: string, props: AmplifyCMSProps) {
    super(scope, id);

    const bucket = new Bucket(this, `${id}Bucket`, {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new BucketDeployment(this, `${id}Deployment`, {
      destinationBucket: bucket,
      sources: [
        Source.data(
          MODEL_INTROSPECTION_SCHEMA_KEY,
          props.modelIntrospectionSchema
        ),
        Source.data(DATASTORE_SCHEMA_KEY, props.datastoreSchema),
      ],
      // Bucket deployment uses a Lambda that runs AWS S3 CLI to transfer assets to destination bucket.
      // That Lambda requires higher memory setting to run fast even when processing small assets (less than 1kB).
      // This setting has been established experimentally. Benchmark can be found in pull request description that established it.
      // The value has been chosen to prefer the lowest cost (run time * memory demand) while providing reasonable performance.
      memoryLimit: 1536,
    });
  }
}

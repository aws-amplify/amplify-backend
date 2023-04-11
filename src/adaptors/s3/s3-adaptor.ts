import {
  aws_s3 as s3,
  Stack,
  aws_lambda as lambda,
  aws_lambda_event_sources as eventSource,
  aws_sqs as sqs,
  aws_s3_notifications,
} from 'aws-cdk-lib';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { z } from 'zod';
import { ConstructAdaptor, ConstructAdaptorFactory, LambdaEventSource, AmplifyInitializer, AmplifyPolicyContent } from '../../types';
import { ResourceAccessPolicy } from '../../input-definitions/ir-definition';

export const init: AmplifyInitializer = () => {
  return new AmplifyS3AdaptorFactory();
};

class AmplifyS3AdaptorFactory implements ConstructAdaptorFactory {
  constructor() {}

  getConstructAdaptor(scope: Construct, name: string): ConstructAdaptor {
    return new AmplifyS3Adaptor(scope, name);
  }
}

class AmplifyS3Adaptor extends ConstructAdaptor implements LambdaEventSource {
  private bucket: s3.Bucket | undefined;
  constructor(scope: Construct, private readonly name: string) {
    super(scope, name);
  }

  getDefinitionSchema() {
    return inputSchema;
  }

  init(configuration: FileStorageConfig) {
    s3.BucketEncryption.KMS_MANAGED;
    this.bucket = new s3.Bucket(this, this.name, {
      enforceSSL: configuration.enforceSSL,
    });
  }

  finalizeResources(): void {
    Stack.of(this).addMetadata('bucketArn', this.bucket!.bucketArn);
  }

  attachLambdaEventHandler(eventSourceName: string, handler: lambda.IFunction): void {
    if (eventSourceName !== 'stream') {
      throw new Error(`Unknown event source name ${eventSourceName}`);
    }

    const s3StreamQueue = new sqs.Queue(this, 's3-stream-queue');
    this.bucket!.addEventNotification(EventType.OBJECT_CREATED, new aws_s3_notifications.SqsDestination(s3StreamQueue));

    handler.addEventSource(new eventSource.SqsEventSource(s3StreamQueue));
  }

  getPolicyContent({ actions }: ResourceAccessPolicy): AmplifyPolicyContent {
    const actionSet = new Set<string>();
    // TODO these permissions are overly permissive but they work for a POC
    actions.forEach((action) => {
      switch (action) {
        case 'create':
          actionSet.add('s3:Put*');
          break;
        case 'read':
          actionSet.add('s3:Get*');
          break;
        case 'update':
          actionSet.add('s3:Put*');
          break;
        case 'delete':
          actionSet.add('s3:Delete*');
          break;
        case 'list':
          actionSet.add('s3:List*');
          break;
        default:
          throw new Error(`Unknown action ${action} specified for ${this.name}`);
      }
    });
    return {
      arnToken: this.bucket!.bucketArn,
      physicalNameToken: this.bucket!.bucketName,
      actions: Array.from(actionSet),
      resourceSuffixes: [],
    };
  }
}

const inputSchema = z.object({
  enforceSSL: z.boolean().default(true).optional(),
});

export type FileStorageConfig = z.infer<typeof inputSchema>;

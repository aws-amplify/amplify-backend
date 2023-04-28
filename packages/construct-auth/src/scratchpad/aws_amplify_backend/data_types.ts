import { AmplifyConstruct, FeatureBuilder } from './base_types.js';
import { Construct } from 'constructs';
import {
  GraphqlApi,
  Resolver,
  BackedDataSource,
} from 'aws-cdk-lib/aws-appsync';
import { IPolicy, Policy } from 'aws-cdk-lib/aws-iam';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

type DataProps = {
  schema: object;
};

type DataEvent = undefined;
type DataRole = undefined;
type DataAction = 'query' | 'mutate' | 'subscribe';
type DataScope = undefined;
type DataResources = {
  api: GraphqlApi;
  resolvers: Record<string, Resolver>;
  dataSources: Record<string, BackedDataSource>;
  modelTables: Record<string, ITable>;
};

class DataConstruct
  extends Construct
  implements
    AmplifyConstruct<DataEvent, DataRole, DataAction, DataScope, DataResources>
{
  resources: DataResources;

  constructor(scope: Construct, name: string, props: DataProps) {
    super(scope, name);

    // run transformer
    // create a bunch of resources
  }

  actions(actions: DataAction[], scopes?: DataScope[]) {
    return new Policy(this, 'policy');
  }

  grant(role: DataRole, policy: IPolicy): this {
    return this;
  }

  onCloudEvent(event: DataEvent, handler: IFunction): this {
    return this;
  }
}
/**
 * Create a cloud Data API
 */
export const Data: FeatureBuilder<
  DataProps,
  DataEvent,
  DataRole,
  DataAction,
  DataScope,
  DataResources
> = (props: DataProps) => (ctx, name) => {
  return new DataConstruct(ctx.getScope(), name, props);
};

export const a = {} as any;

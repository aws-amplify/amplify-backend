import { IPolicy, IRole, Policy } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import {
  IFunction,
  Function,
  Runtime,
  Code,
  FunctionProps,
} from 'aws-cdk-lib/aws-lambda';
import { AmplifyConstruct, FeatureBuilder } from './base_types.js';

type FnProps = (...args: any[]) => Promise<any> | any;

type FnEvent = undefined;
type FnRole = 'runtime';
type FnAction = 'invoke';
type FnScope = undefined;
type FnResources = {
  lambda: IFunction;
  executionRole: IRole;
};
type IsHandler = true;

class FnConstruct
  extends Function
  implements
    AmplifyConstruct<
      FnEvent,
      FnRole,
      FnAction,
      FnScope,
      FnResources,
      IsHandler
    >
{
  resources: FnResources;

  constructor(scope: Construct, name: string, props: FunctionProps) {
    super(scope, name, props);
    this.resources.lambda = this;
    this.resources.executionRole = this.role;
  }

  grant(role: FnRole, policy: IPolicy) {
    return this;
  }

  actions(actions: FnAction[], scopes?: FnScope[]) {
    return new Policy(this, 'policy');
  }

  onCloudEvent(event: FnEvent, handler: IFunction): this {
    return this;
  }
}
/**
 * Create a cloud function
 */
export const Fn: FeatureBuilder<
  FnProps,
  FnEvent,
  FnRole,
  FnAction,
  FnScope,
  FnResources,
  IsHandler
> = (props: FnProps) => (ctx, name) => {
  // introspect and build function
  // construct props from build artifact location
  const functionProps: FunctionProps = {
    runtime: Runtime.NODEJS_18_X,
    code: Code.fromAsset('.build/hash'),
    handler: 'index.handler',
  };
  return new FnConstruct(ctx.getScope(), name, functionProps);
};

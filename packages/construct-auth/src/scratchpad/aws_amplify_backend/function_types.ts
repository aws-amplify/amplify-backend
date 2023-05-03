import { IPolicy, IRole, Policy } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import {
  IFunction,
  Function,
  Runtime,
  Code,
  FunctionProps,
} from 'aws-cdk-lib/aws-lambda';
import {
  AmplifyConstruct,
  AmplifyContext,
  ConstructBuilder,
  RuntimeEntity,
  WithOverride,
} from './base_types.js';

type AnyFunction = (...args: any[]) => Promise<any> | any;
type FnBuilderProps =
  | AnyFunction
  | ({
      cloudFunction: AnyFunction;
    } & WithOverride<FnResources>)
  | (FunctionProps & { buildCommand?: string });

type FnRuntimeEntityName = 'runtime';
type FnEvent = never;
type FnAction = never;
type FnScope = never;
type FnResources = {
  lambda: IFunction;
  executionRole: IRole;
};
type FnIsHandler = true;
type FnHasDefaultEntityName = true;

class FnConstruct
  extends Function
  implements
    AmplifyConstruct<
      FnRuntimeEntityName,
      FnEvent,
      FnAction,
      FnScope,
      FnResources,
      FnIsHandler,
      FnHasDefaultEntityName
    >
{
  lambda: IFunction;
  executionRole: IRole;

  constructor(scope: Construct, name: string, props: FunctionProps) {
    super(scope, name, props);
    this.lambda = this;
    this.executionRole = this.role;
  }

  supplyRuntimeEntity(runtimeEntityName?: FnRuntimeEntityName): RuntimeEntity {
    return {
      role: this.executionRole,
    };
  }

  setTrigger(eventName: FnEvent, handler: IFunction): void {
    // for some reason TS is making me implement this but not sure why
    return undefined;
  }
}

export const Fn = FnBuilder;

class FnBuilder
  implements
    ConstructBuilder<
      FnRuntimeEntityName,
      FnEvent,
      FnAction,
      FnScope,
      FnResources,
      FnIsHandler,
      FnHasDefaultEntityName
    >
{
  private construct: FnConstruct;
  private readonly fnProps: FunctionProps;
  constructor(private readonly props: FnBuilderProps) {
    if (typeof props === 'function') {
      throw new Error('cb serialization not implemented');
    } else if ('cloudFunction' in props) {
      throw new Error('cb serialization not implemented');
    } else {
      this.fnProps = props;
    }
  }

  build(ctx: AmplifyContext, name: string) {
    if (this.construct) {
      return this.construct;
    }
    this.construct = new FnConstruct(ctx.getScope(), name, this.fnProps);
    return this.construct;
  }
}

import { Construct } from 'constructs';
import type * as cdk from 'aws-cdk-lib';

export type AmplifyCdkType = typeof cdk;
export { cdk as AmplifyCdkWrap };

/**
 * A Construct that can attach runtime access for the runtimeEntityName to access resource
 *
 */
export type RuntimeAccessAttacher = {
  /**
   * runtimeEntityName is a key known to the RuntimeAccessAttacher that corresponds to a role that the construct provisions
   * policy is a policy document that should be attached to the role referenced by runtimeEntityName
   * resource is the name and arn of the resource that the policy grants access to
   */
  attachRuntimePolicy(runtimeEntityName: string, policy: cdk.aws_iam.PolicyDocument, resource: ResourceNameArnTuple): void;
};

/**
 * A Construct that can grant a role access to certain actions on itself
 */
export type RuntimeAccessGranter = {
  getPolicyGranting(permissions: unknown): cdk.aws_iam.PolicyDocument;
};

/**
 * A Construct that has an event source that can be attached to a handler
 *
 * Works in tandem with the LambdaEventHandler below.
 * The platform first calls getLambdaRef on the LambdaEventHandler, then passes the lambda ref to attachLambdaEventHandler on the LambdaEventSource
 */
export type LambdaEventSource = {
  attachLambdaEventHandler(eventSourceName: string, handler: cdk.aws_lambda.IFunction): void;
};

/**
 * A Construct that can be attached to an event source
 */
export type LambdaEventHandler = {
  getLambdaRef(): cdk.aws_lambda.IFunction;
};

export type DynamoTableBuilderConsumer = {
  setDynamoTableBuilder(tableKey: string, tableBuilder: DynamoTableBuilder): void;
};

export type DynamoTableBuilder = {
  setTableProps(props: cdk.aws_dynamodb.TableProps): void;
  addGlobalSecondaryIndex(props: cdk.aws_dynamodb.GlobalSecondaryIndexProps): void;
};

export type AmplifyTransformFunctionalInterfaceUnion = LambdaEventHandler &
  LambdaEventSource &
  RuntimeAccessAttacher &
  RuntimeAccessGranter &
  DynamoTableBuilder &
  DynamoTableBuilderConsumer;

/**
 * Base class that all Amplify resource classes extend from
 */
export abstract class AmplifyServiceProvider<T = object> extends Construct implements Partial<AmplifyTransformFunctionalInterfaceUnion> {
  /**
   * Returns a construtable Class that can be used
   */
  abstract getAnnotatedConfigClass(): new () => T;
  /**
   * The output of parseConfiguration is then passed to this method
   * @param configuration
   */
  abstract init(configuration: T): void;
  /**
   * Called at the end of the transformation process to indicate to the construct that it can finalize any pending configuration
   */
  abstract finalize(): void;
  /**
   * This method must be implemented if this construct has a lambda that can be attached to other resources
   */
  getLambdaRef?(): cdk.aws_lambda.IFunction;
  /**
   * This method must be implemented if this construct has event sources that lambdas can be attached to
   * @param eventSourceName The name of the event source within the construct
   * @param handler The name and arn of the lambda handler
   */
  attachLambdaEventHandler?(eventSourceName: string, handler: cdk.aws_lambda.IFunction): void;
  /**
   * This method must be implemented to allow other constructs in the project to access this construct
   * @param permissions
   */
  getPolicyGranting?(permissions: unknown): cdk.aws_iam.PolicyDocument;
  /**
   * This method must be implemented if this construct defines resources that can access other resources at runtime
   * @param runtimeEntityName
   * @param policy
   * @param resource
   */
  attachRuntimePolicy?(runtimeEntityName: string, policy: cdk.aws_iam.PolicyDocument, resource: ResourceNameArnTuple): void;

  getDynamoTableBuilder?(): DynamoTableBuilder;

  setDynamoTableBuilder?(name: string, manager: DynamoTableBuilder): void;
}

export type AmplifyServiceProviderFactory = {
  getServiceProvider(scope: Construct, name: string): AmplifyServiceProvider;
};

export type ResourceNameArnTuple = {
  name: string;
  arn: string;
};

export type AmplifyPolicy = {
  actions: string[];
  resources: string[];
};

export type AmplifyResourceNameArnTuple = {
  name: string;
  arn: string;
};

export type IAmplifyLogger = {
  error(message: string): void;
  warn(message: string): void;
  info(message: string): void;
  debug(message: string): void;
  trace(message: string): void;
};

export type IAmplifyMetrics = {
  tbd(info: string): void;
};

/**
 * All Amplify transformer plugins must implement a function called 'init' that implements this type
 * This is the entry point into the plugin that the transformer uses to initialize every plugin
 *
 * It is guaranteed to only be called once by the platform
 */
export type AmplifyInitializer = (awsCdkLib: AmplifyCdkType, logger: IAmplifyLogger, metrics: IAmplifyMetrics) => AmplifyServiceProviderFactory;

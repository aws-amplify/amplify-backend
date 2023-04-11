import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { z } from 'zod';
import { ResourceAccessPolicy } from './input-definitions/ir-definition';

export type AmplifyCdkType = typeof cdk;
export { cdk as aCDK };

export type AmplifyZodType = typeof z;
export { z as aZod };

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
  attachRuntimePolicy: (runtimeEntityName: string, policy: cdk.aws_iam.PolicyStatement, resource: RuntimeResourceInfo) => void;
};

/**
 * A Construct that can grant a role access to certain actions on itself
 */
export type RuntimeAccessGranter = {
  getPolicyContent(permissions: ResourceAccessPolicy): AmplifyPolicyContent;
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

export type AmplifySecret = {
  // acceptSecret can call either getValueToken or grantRuntimeAccess on the secret
  // if grantRuntimeAccess is called, this indicates that the platform should invoke attachRuntimePolicy for the specified runtimeEntityName and secret config
  getValueToken(): string;
  grantRuntimeAccess(runtimeEntityName: string): void;
};

export type SecretHandler = {
  acceptSecret(name: string, secret: AmplifySecret): void;
};

export type AmplifyTransformFunctionalInterfaceUnion = LambdaEventHandler &
  LambdaEventSource &
  RuntimeAccessAttacher &
  RuntimeAccessGranter &
  DynamoTableBuilder &
  DynamoTableBuilderConsumer &
  SecretHandler;

/**
 * Base class that all Amplify resource classes extend from
 */
export abstract class ConstructAdaptor extends Construct implements Partial<AmplifyTransformFunctionalInterfaceUnion> {
  /**
   * The contentsof resources.<resourceName>.definition is passed to the parse method of the returned zod object. The result of parse is then passed to init()
   * Returning zod object instead of a validator so that error handling can be done centrally in the platform
   */
  abstract getDefinitionSchema(): z.AnyZodObject;
  /**
   * @param def
   */
  abstract init(def: unknown): void;
  /**
   * Called at the end of the transformation process to indicate to the construct that it can finalize any pending configuration
   */
  abstract finalizeResources(): void;
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
  getPolicyContent?(permissions: ResourceAccessPolicy): AmplifyPolicyContent;
  /**
   * This method must be implemented if this construct defines resources that can access other resources at runtime
   * @param runtimeRoleName
   * @param policy
   * @param resource
   */
  attachRuntimePolicy?(runtimeRoleName: string, policy: cdk.aws_iam.PolicyStatement, resource: RuntimeResourceInfo): void;

  getDynamoTableBuilder?(): DynamoTableBuilder;

  setDynamoTableBuilder?(name: string, manager: DynamoTableBuilder): void;

  acceptSecret?(name: string, secret: AmplifySecret): void;
}

export type ConstructAdaptorFactory = {
  getConstructAdaptor(scope: Construct, name: string): ConstructAdaptor;
};

export type RuntimeResourceInfo = {
  resourceName: string;
  arnToken: string;
  physicalNameToken: string;
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

export type AmplifyPolicyContent = {
  arnToken: string;
  physicalNameToken: string;
  resourceSuffixes: string[];
  actions: string[];
};

/**
 * All Amplify transformer plugins must implement a function called 'init' that implements this type
 * This is the entry point into the plugin that the transformer uses to initialize every plugin
 *
 * It is guaranteed to only be called once by the platform
 */
export type AmplifyInitializer = (
  awsCdkLib: AmplifyCdkType,
  logger: IAmplifyLogger,
  metrics: IAmplifyMetrics,
  az: AmplifyZodType
) => ConstructAdaptorFactory;

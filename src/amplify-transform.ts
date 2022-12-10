import { Construct } from "constructs";
import {
  ResourceDefinitionRecord,
  ExternalToken,
  ResourceName,
  TransformKey,
} from "./manifest-types";
import { getDagWalker, NodeVisitor } from "./dag-walker";
import { AmplifyResourceTransform, AmplifyConstruct } from "./types";
import { AmplifyReference, AmplifyStack } from "./amplify-stack";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { aws_lambda, aws_iam } from "aws-cdk-lib";

export class AmplifyTransform extends Construct {
  private readonly resourceConstructMap: Record<
    ResourceName,
    AmplifyConstruct
  > = {};
  private readonly dagWalker: (visitor: NodeVisitor) => void;

  constructor(
    scope: Construct,
    private readonly envPrefix: string,
    private readonly resourceDefinition: ResourceDefinitionRecord,
    private readonly transformers: Record<
      TransformKey,
      AmplifyResourceTransform
    >
  ) {
    super(scope, envPrefix);

    this.generateResourceConstructMap();

    // constructs a function that can take in a visitor function and execute that visitor on all nodes in the DAG in depenency order
    this.dagWalker = getDagWalker(generateResourceDAG(this.resourceDefinition));
  }

  /**
   * Executes a set of visitors on the resource graph in dependency order
   */
  transform() {
    [this.initVisitor, this.triggerVisitor].forEach((visitor) =>
      this.dagWalker(visitor)
    );
  }

  private generateResourceConstructMap(): void {
    const result: Record<ResourceName, AmplifyConstruct> = {};
    Object.entries(this.resourceDefinition).forEach(
      ([resourceName, resourceDefinition]) => {
        const transformer = this.transformers[resourceDefinition.transformer];
        if (!transformer) {
          throw new Error(
            `No transformer for ${resourceDefinition.transformer} is defined`
          );
        }
        this.resourceConstructMap[resourceName] = transformer.getConstruct(
          new AmplifyStack(this, resourceName, this.envPrefix),
          resourceName
        );
      }
    );
  }

  private initVisitor: NodeVisitor = (node: string): void => {
    // get the config class object from the construct corresponding to this node
    const nodeConstruct = this.resourceConstructMap[node];
    const configClass = nodeConstruct.getAnnotatedConfigClass();

    const configInstance = plainToInstance(
      configClass,
      this.resourceDefinition[node].definition
    );
    validateSync(configInstance);

    nodeConstruct.init(configInstance);
  };

  private triggerVisitor: NodeVisitor = (node: string): void => {
    // if this node does not define any trigger config, early return
    if (!this.resourceDefinition[node].triggers) {
      return;
    }
    const sourceConstruct = this.resourceConstructMap[node];

    // make sure the source construct exposes a lambda event handler
    if (!sourceConstruct.attachLambdaEventHandler) {
      throw new Error(
        `${node} defines trigger configuration but its handler ${this.resourceDefinition[node].transformer} does not implement LambdaEventSource`
      );
    }
    const triggerDefinition = this.resourceDefinition[node].triggers!;
    Object.entries(triggerDefinition).forEach(
      ([eventSourceName, handlerResourceName]) => {
        const handlerConstruct = this.resourceConstructMap[handlerResourceName];
        // make source the destination construct exposes a lambda reference
        if (!handlerConstruct.getLambdaRef) {
          throw new Error(
            `${node} triggers ${handlerResourceName} but its handler ${this.resourceDefinition[handlerResourceName].transformer} does not implement LambdaEventHandler`
          );
        }
        const handlerLambda = handlerConstruct.getLambdaRef();

        // create SSM parameters in the handler stack for the lambda arn and name
        const arnRef = new AmplifyReference(
          handlerConstruct,
          `${handlerResourceName}-arn`,
          handlerLambda.functionArn
        );
        const roleRef = new AmplifyReference(
          handlerConstruct,
          `${handlerResourceName}-role`,
          handlerLambda.role!.roleArn
        );

        // link those parameters to the source stack
        const destArnRef = arnRef.getValue(sourceConstruct);
        const destRoleRef = roleRef.getValue(sourceConstruct);

        // pass the linked lambda refs to the source stack so they can be attached to the source defined by eventSourceName
        sourceConstruct.attachLambdaEventHandler!(
          eventSourceName,
          aws_lambda.Function.fromFunctionAttributes(
            sourceConstruct,
            "handler-lambda",
            {
              functionArn: destArnRef,
              role: aws_iam.Role.fromRoleArn(
                sourceConstruct,
                "handler-role",
                destRoleRef
              ),
            }
          )
        );
      }
    );
  };
}

const generateResourceDAG = (
  resourceDefiniton: ResourceDefinitionRecord
): ResourceDAG => {
  const resourceSet = new Set<ResourceName>(Object.keys(resourceDefiniton));
  const resourceDag: Record<ResourceName, ResourceName[]> = {};
  resourceSet.forEach((resourceName) => (resourceDag[resourceName] = []));

  Object.entries(resourceDefiniton).forEach(
    ([resourceName, resourceDefiniton]) => {
      if (resourceDefiniton.runtimeAccess) {
        Object.values(resourceDefiniton.runtimeAccess).forEach(
          (runtimeResourceAccess) => {
            Object.keys(runtimeResourceAccess).forEach((resourceToken) => {
              if (resourceToken === ExternalToken) {
                return;
              }
              if (!resourceSet.has(resourceToken)) {
                throw new Error(
                  `${resourceName} declares a dependency on ${resourceToken} but ${resourceToken} is not defined in the project config`
                );
              }
              resourceDag[resourceName]!.push(resourceToken);
            });
          }
        );
      }
    }
  );
  return resourceDag;
};

type ResourceDAG = Record<ResourceName, ResourceName[]>;

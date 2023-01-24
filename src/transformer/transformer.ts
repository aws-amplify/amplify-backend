import { Construct } from 'constructs';
import { ResourceRecord, ExternalToken, ResourceName, ProviderKey } from '../manifest/manifest-types';
import { getDagWalker, NodeVisitor } from './dag-walker';
import { AmplifyServiceProviderFactory, AmplifyServiceProvider } from '../types';
import { AmplifyReference, AmplifyStack } from '../amplify-reference';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { aws_lambda, aws_iam } from 'aws-cdk-lib';

export class AmplifyTransformerOrchestrator {
  private readonly resourceProviderMap: Record<ResourceName, AmplifyServiceProvider> = {};
  private readonly dagWalker: (visitor: NodeVisitor) => void;

  constructor(
    private readonly envPrefix: string,
    private readonly resourceDefinition: ResourceRecord,
    private readonly providerFactories: Record<ProviderKey, AmplifyServiceProviderFactory>
  ) {
    // constructs a function that can take in a visitor function and execute that visitor on all nodes in the DAG in depenency order
    this.dagWalker = getDagWalker(generateResourceDAG(this.resourceDefinition));
  }

  /**
   * Executes a set of visitors on the resource graph in dependency order
   */
  transform(scope: Construct) {
    this.constructResourceProviderMap(scope);
    [this.initVisitor, this.triggerVisitor].forEach((visitor) => this.dagWalker(visitor));
  }

  private constructResourceProviderMap(scope: Construct): void {
    Object.entries(this.resourceDefinition).forEach(([resourceName, resourceDefinition]) => {
      const transformer = this.providerFactories[resourceDefinition.provider];
      if (!transformer) {
        throw new Error(`No transformer for ${resourceDefinition.provider} is defined`);
      }
      this.resourceProviderMap[resourceName] = transformer.getServiceProvider(new AmplifyStack(scope, resourceName, this.envPrefix), resourceName);
    });
  }

  private initVisitor: NodeVisitor = (node: string): void => {
    // get the config class object from the construct corresponding to this node
    const resourceProvider = this.resourceProviderMap[node];
    const configClass = resourceProvider.getAnnotatedConfigClass();

    const configInstance = plainToInstance(configClass, this.resourceDefinition[node].definition);

    // TODO validate resource definition before passing to the plugin
    // validateSync(configInstance);

    resourceProvider.init(configInstance);
  };

  private triggerVisitor: NodeVisitor = (node: string): void => {
    // if this node does not define any trigger config, early return
    if (!this.resourceDefinition[node].triggers) {
      return;
    }
    const triggerSourceProvider = this.resourceProviderMap[node];

    // make sure the source provider exposes a lambda event handler
    if (!triggerSourceProvider.attachLambdaEventHandler) {
      throw new Error(
        `${node} defines trigger configuration but its provider ${this.resourceDefinition[node].provider} does not implement LambdaEventSource`
      );
    }
    const triggerDefinition = this.resourceDefinition[node].triggers!;
    Object.entries(triggerDefinition).forEach(([eventSourceName, handlerResourceName]) => {
      const handlerConstruct = this.resourceProviderMap[handlerResourceName];
      // make source the destination construct exposes a lambda reference
      if (!handlerConstruct.getLambdaRef) {
        throw new Error(
          `${node} triggers ${handlerResourceName} but its provider ${this.resourceDefinition[handlerResourceName].provider} does not implement LambdaEventHandler`
        );
      }
      const handlerLambda = handlerConstruct.getLambdaRef();

      // create SSM parameters in the handler stack for the lambda arn and role
      const arnRef = new AmplifyReference(handlerConstruct, `${handlerResourceName}-arn`, handlerLambda.functionArn);
      const roleRef = new AmplifyReference(handlerConstruct, `${handlerResourceName}-role`, handlerLambda.role!.roleArn);

      // link those parameters to the source stack
      const destArnRef = arnRef.getValue(triggerSourceProvider);
      const destRoleRef = roleRef.getValue(triggerSourceProvider);

      // pass the linked lambda refs to the source stack so they can be attached to the source defined by eventSourceName
      triggerSourceProvider.attachLambdaEventHandler!(
        eventSourceName,
        aws_lambda.Function.fromFunctionAttributes(triggerSourceProvider, 'handler-lambda', {
          functionArn: destArnRef,
          role: aws_iam.Role.fromRoleArn(triggerSourceProvider, 'handler-role', destRoleRef),
        })
      );
    });
  };
}

const generateResourceDAG = (resourceDefiniton: ResourceRecord): ResourceDAG => {
  const resourceSet = new Set<ResourceName>(Object.keys(resourceDefiniton));
  const resourceDag: Record<ResourceName, ResourceName[]> = {};
  resourceSet.forEach((resourceName) => (resourceDag[resourceName] = []));

  Object.entries(resourceDefiniton).forEach(([resourceName, resourceDefiniton]) => {
    if (resourceDefiniton.runtimeAccess) {
      Object.values(resourceDefiniton.runtimeAccess).forEach((runtimeResourceAccess) => {
        Object.keys(runtimeResourceAccess).forEach((resourceToken) => {
          if (resourceToken === ExternalToken) {
            return;
          }
          if (!resourceSet.has(resourceToken)) {
            throw new Error(`${resourceName} declares a dependency on ${resourceToken} but ${resourceToken} is not defined in the project config`);
          }
          resourceDag[resourceName]!.push(resourceToken);
        });
      });
    }
  });
  return resourceDag;
};

type ResourceDAG = Record<ResourceName, ResourceName[]>;

import { Construct } from 'constructs';
import { ResourceRecord, ExternalToken, ResourceName, ProviderKey } from '../manifest/manifest-types';
import { getDagWalker, NodeVisitor } from './dag-walker';
import { AmplifyServiceProviderFactory, AmplifyServiceProvider } from '../types';
import { AmplifyReference, AmplifyStack } from '../amplify-reference';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { aws_lambda, aws_iam } from 'aws-cdk-lib';
import execa from 'execa';

export class AmplifyTransformerOrchestrator {
  private readonly serviceProviderRecord: Record<ResourceName, AmplifyServiceProvider> = {};
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
   *
   * This execution is the "transformer lifecycle"
   */
  transform(scope: Construct) {
    this.constructServiceProviderRecord(scope);
    [this.initVisitor, this.triggerVisitor, this.permissionsVisitor, this.finalizeVisitor].forEach((visitor) => this.dagWalker(visitor));
  }

  /**
   * Builds a map of each resource name to an AmplifyServiceProvider instance.
   *
   * It does this by calling the `getServiceProvider` method on the provider factory that the resource has registered
   * @param scope
   */
  private constructServiceProviderRecord(scope: Construct): void {
    Object.entries(this.resourceDefinition).forEach(([resourceName, resourceDefinition]) => {
      const providerFactory = this.providerFactories[resourceDefinition.provider];
      if (!providerFactory) {
        throw new Error(`No transformer for ${resourceDefinition.provider} is defined`);
      }
      this.serviceProviderRecord[resourceName] = providerFactory.getServiceProvider(
        new AmplifyStack(scope, resourceName, this.envPrefix),
        resourceName
      );
    });
  }

  /**
   * Executes the 'init' lifecycle hook on all AmplifyServiceProviders in dependency order
   * @param node
   */
  private initVisitor: NodeVisitor = (node: ResourceName): void => {
    // get the config class object from the construct corresponding to this node
    const resourceProvider = this.serviceProviderRecord[node];
    const configClass = resourceProvider.getAnnotatedConfigClass();

    const configInstance = plainToInstance(configClass, this.resourceDefinition[node].definition);

    // TODO validate resource definition before passing to the plugin
    // validateSync(configInstance);

    resourceProvider.init(configInstance);
  };

  /**
   * Orchestrates wiring together 'getLambdaRef' and 'attachLambdaEventHandler' definitions
   * @param node
   * @returns
   */
  private triggerVisitor: NodeVisitor = (node: ResourceName): void => {
    // if this node does not define any trigger config, early return
    if (!this.resourceDefinition[node].triggers) {
      return;
    }
    const triggerSourceProvider = this.serviceProviderRecord[node];

    // make sure the source provider exposes a lambda event handler
    if (typeof triggerSourceProvider.attachLambdaEventHandler !== 'function') {
      throw new Error(
        `${node} defines trigger configuration but its provider ${this.resourceDefinition[node].provider} does not implement LambdaEventSource`
      );
    }
    const triggerDefinition = this.resourceDefinition[node].triggers!;
    Object.entries(triggerDefinition).forEach(([eventSourceName, handlerResourceName]) => {
      const handlerConstruct = this.serviceProviderRecord[handlerResourceName];
      // make source the destination construct exposes a lambda reference
      if (typeof handlerConstruct.getLambdaRef !== 'function') {
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

  /**
   * Orchestrates wiring together 'getPolicyGranting' and 'attachRuntimePolicy'
   * @param node
   */
  private permissionsVisitor: NodeVisitor = (node: ResourceName): void => {
    const permissionDefinition = this.resourceDefinition[node].runtimeAccess;
    if (!permissionDefinition) {
      return;
    }
    const permissionAcceptor = this.serviceProviderRecord[node];
    if (typeof permissionAcceptor.attachRuntimePolicy !== 'function') {
      throw new Error(
        `${node} delares runtime access to project resources but ${this.resourceDefinition[node].provider} does not implement RuntimeAccessAttacher`
      );
    }

    /**
     * This chunk of code is pretty dense and would definite be broken up
     *
     * It iterates over all the runtime access config and for each config found, it calls the granter to get the IAM actions / resource strings corresponding to the config
     * Then it creates loose references between granting and accepting stacks
     * Then it constructs IAM policy statements in the context of the accepting stack
     * It then passes that statemen to the accepting resource which is responsible for wiring the the policy to an IAM role and any other plumbing within that construct
     */
    Object.entries(permissionDefinition).forEach(([runtimeRoleToken, resourceAccess]) => {
      Object.entries(resourceAccess).forEach(([resourceToken, resourceAccessConfigs]) => {
        const permissionGranter = this.serviceProviderRecord[resourceToken];
        if (typeof permissionGranter.getPolicyContent !== 'function') {
          throw new Error(
            `${node} delcares runtime access to ${resourceToken} but ${this.resourceDefinition[resourceToken].provider} does not implement RuntimeAccessGranter`
          );
        }

        const policyContents = resourceAccessConfigs.map((resourceAccessConfig) => permissionGranter.getPolicyContent!(resourceAccessConfig));
        policyContents.forEach((policyContent) => {
          const arnRef = new AmplifyReference(permissionGranter, `${resourceToken}-arn`, policyContent.resourceArn);

          const destArnRef = arnRef.getValue(permissionAcceptor);
          const policyDocument = new aws_iam.PolicyStatement({
            actions: policyContent.actions,
            resources: policyContent.resourceSuffixes.map((suffix) => `${destArnRef}${suffix}`),
          });
          permissionAcceptor.attachRuntimePolicy!(runtimeRoleToken, policyDocument, { name: resourceToken, arn: destArnRef });
        });
      });
    });
  };

  private finalizeVisitor: NodeVisitor = (node: ResourceName): void => {
    const provider = this.serviceProviderRecord[node];
    provider.finalize();
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

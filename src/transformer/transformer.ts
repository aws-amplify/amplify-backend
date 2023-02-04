import { Construct } from 'constructs';
import { ResourceRecord, ResourceToken, ProviderToken } from '../manifest/manifest-schema';
import { getDagWalker, NodeVisitor } from './dag-walker';
import { AmplifyServiceProviderFactory, AmplifyServiceProvider } from '../types';
import { AmplifyReference, AmplifyStack } from '../amplify-reference';
import { aws_lambda, aws_iam } from 'aws-cdk-lib';

const EXTERNAL_TOKEN = '$external';

export class AmplifyTransformer {
  private readonly serviceProviderRecord: Record<ResourceToken, AmplifyServiceProvider> = {};
  private readonly dagWalker: (visitor: NodeVisitor) => void;

  constructor(
    private readonly envPrefix: string,
    private readonly resourceDefinition: ResourceRecord,
    private readonly providerFactories: Record<ProviderToken, AmplifyServiceProviderFactory>
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
    [this.initVisitor, this.triggerVisitor, this.finalizeVisitor, this.permissionsVisitor].forEach((visitor) => this.dagWalker(visitor));
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
  private initVisitor: NodeVisitor = (node: ResourceToken): void => {
    // get the config class object from the construct corresponding to this node
    const resourceProvider = this.serviceProviderRecord[node];

    const schema = resourceProvider.getDefinitionSchema();

    const definition = this.resourceDefinition[node].definition;
    const parseResult = schema.safeParse(definition);
    if (!parseResult.success) {
      console.error(parseResult.error);
      throw new Error(`Error parsing input definition for ${node}`);
    }
    // pass the resource definition to the init method
    resourceProvider.init(parseResult.data);
  };

  /**
   * Orchestrates wiring together 'getLambdaRef' and 'attachLambdaEventHandler' definitions
   * @param node
   * @returns
   */
  private triggerVisitor: NodeVisitor = (node: ResourceToken): void => {
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
  private permissionsVisitor: NodeVisitor = (node: ResourceToken): void => {
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
     * This chunk of code is pretty dense and should be broken up
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
          const arnRef = new AmplifyReference(permissionGranter, `${resourceToken}-arn`, policyContent.resourceArnToken);
          const nameRef = new AmplifyReference(permissionGranter, `${resourceToken}-name`, policyContent.resourceNameToken);

          const destArnRef = arnRef.getValue(permissionAcceptor);
          const destNameRef = nameRef.getValue(permissionAcceptor);

          const policyDocument = new aws_iam.PolicyStatement({
            actions: policyContent.actions,
            resources: policyContent.resourceSuffixes.map((suffix) => `${destArnRef}${suffix}`),
          });
          permissionAcceptor.attachRuntimePolicy!(runtimeRoleToken, policyDocument, { name: destNameRef, arn: destArnRef });
        });
      });
    });
  };

  private finalizeVisitor: NodeVisitor = (node: ResourceToken): void => {
    const provider = this.serviceProviderRecord[node];
    provider.finalizeResources();
  };
}

const generateResourceDAG = (resourceDefiniton: ResourceRecord): ResourceDAG => {
  const resourceSet = new Set<ResourceToken>(Object.keys(resourceDefiniton));
  const resourceDag: Record<ResourceToken, ResourceToken[]> = {};
  resourceSet.forEach((resourceName) => (resourceDag[resourceName] = []));

  Object.entries(resourceDefiniton).forEach(([resourceName, resourceDefiniton]) => {
    if (resourceDefiniton.runtimeAccess) {
      Object.values(resourceDefiniton.runtimeAccess).forEach((runtimeResourceAccess) => {
        Object.keys(runtimeResourceAccess).forEach((resourceToken) => {
          if (resourceToken === '$external') {
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

type ResourceDAG = Record<ResourceToken, ResourceToken[]>;

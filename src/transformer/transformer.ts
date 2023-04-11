import { Construct } from 'constructs';
import { ConstructAdaptorFactory, ConstructAdaptor } from '../types';
import { AmplifyReference, AmplifyStack } from '../amplify-reference';
import { aws_lambda, aws_iam, Fn, Stack } from 'aws-cdk-lib';
import { ConstructConfig, ConstructMap } from '../input-definitions/ir-definition';

export class AmplifyTransformer {
  private readonly constructAdaptorMap: Record<string, ConstructAdaptor> = {};

  constructor(
    private readonly envPrefix: string,
    private readonly constructMap: ConstructMap,
    private readonly constructAdaptorFactories: Record<string, ConstructAdaptorFactory>
  ) {}

  /**
   * Executes a set of visitors on the construct map
   *
   * This execution is the "transformer lifecycle"
   */
  transform(scope: Construct) {
    this.initializeConstructAdaptors(scope);
    [this.initVisitor, this.triggerVisitor, this.finalizeVisitor, this.permissionsVisitor].forEach((visitor) => {
      Object.entries(this.constructMap).forEach(([constructName, constructConfig]) => {
        visitor(constructName, this.constructAdaptorMap[constructName], constructConfig);
      });
    });
  }

  /**
   * Initializes a ConstructAdaptor for each construct defined in the project and adds it to the constructAdaptorMap
   *
   * It does this by calling getConstructAdaptor on the constructAdaptorFactory for the given constructConfig
   */
  private initializeConstructAdaptors(scope: Construct): void {
    // an entry A: B in this record indicates that A is triggered by B
    const triggerRelationships: Record<string, string> = {};
    Object.entries(this.constructMap).forEach(([constructName, constructConfig]) => {
      Object.values(constructConfig.triggers || {}).forEach((trigger) => {
        triggerRelationships[trigger] = constructName;
      });
    });

    // initialize all non-triggered resources
    Object.entries(this.constructMap)
      .filter(([constructName]) => !triggerRelationships[constructName]) // filter out constructs that are triggered by other constructs
      .forEach(([constructName, constructConfig]) => {
        const constructAdaptorFactory = this.constructAdaptorFactories[constructConfig.adaptor];
        this.constructAdaptorMap[constructName] = constructAdaptorFactory.getConstructAdaptor(
          new AmplifyStack(scope, constructName, this.envPrefix),
          constructName
        );
      });

    // initialize triggered resources in the parent stack
    Object.entries(this.constructMap)
      .filter(([constructName]) => triggerRelationships[constructName])
      .forEach(([constructName, constructConfig]) => {
        const parentConstructName = triggerRelationships[constructName];
        const constructAdaptorFactory = this.constructAdaptorFactories[constructConfig.adaptor];

        this.constructAdaptorMap[constructName] = constructAdaptorFactory.getConstructAdaptor(
          Stack.of(this.constructAdaptorMap[parentConstructName]),
          constructName
        );
      });
  }

  /**
   * Executes the 'init' lifecycle hook on all AmplifyServiceProviders in dependency order
   * @param constructName
   */
  private initVisitor: ConstructVisitor = (constructName, constructAdaptor, constructConfig): void => {
    const schema = constructAdaptor.getDefinitionSchema();

    const properties = constructConfig.properties;
    const parseResult = schema.safeParse(properties);
    if (!parseResult.success) {
      console.error(parseResult.error);
      throw new Error(`Error parsing input definition for ${constructName}`);
    }

    // pass the resource definition to the init method
    constructAdaptor.init(parseResult.data);
  };

  /**
   * Orchestrates wiring together 'getLambdaRef' and 'attachLambdaEventHandler' definitions
   * @param constructName
   */
  private triggerVisitor: ConstructVisitor = (constructName, constructAdaptor, constructConfig): void => {
    // if this node does not define any trigger config, early return
    if (!constructConfig.triggers || Object.keys(constructConfig.triggers).length === 0) {
      return;
    }

    // make sure the source provider exposes a lambda event handler
    if (typeof constructAdaptor.attachLambdaEventHandler !== 'function') {
      throw new Error(
        `${constructName} defines trigger configuration but its provider ${constructConfig.adaptor} does not implement LambdaEventSource`
      );
    }
    const triggerDefinition = constructConfig.triggers!;
    Object.entries(triggerDefinition).forEach(([eventSourceName, handlerResourceName]) => {
      const handlerConstructAdaptor = this.constructAdaptorMap[handlerResourceName];
      // make source the destination construct exposes a lambda reference
      if (typeof handlerConstructAdaptor.getLambdaRef !== 'function') {
        throw new Error(
          `${constructName} triggers ${handlerResourceName} but its adaptor ${this.constructMap[handlerResourceName].adaptor} does not implement LambdaEventHandler`
        );
      }
      const handlerLambda = handlerConstructAdaptor.getLambdaRef();

      if (Stack.of(handlerLambda) === Stack.of(constructAdaptor)) {
        constructAdaptor.attachLambdaEventHandler!(eventSourceName, handlerLambda);
        return;
      }

      // create SSM parameters in the handler stack for the lambda arn and role
      const arnRef = new AmplifyReference(handlerConstructAdaptor, `${handlerResourceName}-arn`, handlerLambda.functionArn);
      const roleRef = new AmplifyReference(handlerConstructAdaptor, `${handlerResourceName}-role`, handlerLambda.role!.roleArn);

      // link those parameters to the source stack
      const destArnRef = arnRef.getValue(constructAdaptor);
      const destRoleRef = roleRef.getValue(constructAdaptor);

      // pass the linked lambda refs to the source stack so they can be attached to the source defined by eventSourceName
      constructAdaptor.attachLambdaEventHandler!(
        eventSourceName,
        aws_lambda.Function.fromFunctionAttributes(constructAdaptor, 'handler-lambda', {
          functionArn: destArnRef,
          role: aws_iam.Role.fromRoleArn(constructAdaptor, 'handler-role', destRoleRef),
        })
      );
    });
  };

  /**
   * Orchestrates wiring together 'getPolicyGranting' and 'attachRuntimePolicy'
   */
  private permissionsVisitor: ConstructVisitor = (constructName, constructAdaptor, constructConfig): void => {
    // check if the current resource declares any runtime access
    const permissionDefinition = constructConfig.runtimeAccess;
    if (!permissionDefinition || Object.keys(permissionDefinition).length === 0) {
      return;
    }

    // check that the current resource implements RuntimeAccessAttacher
    if (typeof constructAdaptor.attachRuntimePolicy !== 'function') {
      throw new Error(
        `${constructName} delares runtime access to project resources but ${this.constructMap[constructName].adaptor} does not implement RuntimeAccessAttacher`
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
    Object.entries(permissionDefinition).forEach(([runtimeRoleToken, resourcePolicies]) => {
      // for each IAM role that this resource provisions
      Object.entries(resourcePolicies).forEach(([targetConstructName, accessConfigList]) => {
        // for each construct that this role has access to
        // check that the target construct implements RuntimeAccessGranter
        const permissionGranter = this.constructAdaptorMap[targetConstructName];
        if (typeof permissionGranter.getPolicyContent !== 'function') {
          throw new Error(
            `${constructName} delcares runtime access to ${targetConstructName} but ${this.constructMap[targetConstructName].adaptor} does not implement RuntimeAccessGranter`
          );
        }

        // ask the target resource for the policy that grants the configured permissions
        const policyContents = accessConfigList.map((resourceAccessConfig) => permissionGranter.getPolicyContent!(resourceAccessConfig));
        policyContents.forEach((policyContent) => {
          // for each policy

          let destArnToken = policyContent.arnToken;
          let destNameToken = policyContent.physicalNameToken;

          // check if we need to make weak references
          if (Stack.of(permissionGranter) !== Stack.of(constructAdaptor)) {
            // construct weak references using AmplifyReference
            const arnRef = new AmplifyReference(permissionGranter, `${targetConstructName}-arn`, policyContent.arnToken);
            const nameRef = new AmplifyReference(permissionGranter, `${targetConstructName}-name`, policyContent.physicalNameToken);

            destArnToken = arnRef.getValue(constructAdaptor);
            destNameToken = nameRef.getValue(constructAdaptor);
          }

          // append suffix scopes (if any) to the resource arn
          const resources =
            policyContent.resourceSuffixes.length > 0
              ? policyContent.resourceSuffixes.map((suffix) => Fn.join('', [destArnToken, suffix]))
              : [destArnToken];

          // construct the policy document
          const policyDocument = new aws_iam.PolicyStatement({
            actions: policyContent.actions,
            resources,
          });

          // pass the policy document to the permissionAcceptor along with additional info about the resource
          constructAdaptor.attachRuntimePolicy!(runtimeRoleToken, policyDocument, {
            resourceName: targetConstructName,
            physicalNameToken: destNameToken,
            arnToken: destArnToken,
          });
        });
      });
    });
  };

  private finalizeVisitor: ConstructVisitor = (_, constructAdaptor): void => {
    constructAdaptor.finalizeResources();
  };
}

type ConstructVisitor = (constructName: string, constructAdaptor: ConstructAdaptor, constructConfig: ConstructConfig) => void;

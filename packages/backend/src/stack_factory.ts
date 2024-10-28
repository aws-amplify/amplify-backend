import {
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';

export type AmplifyStackBase = {
  readonly stack: Stack;
};

export type DefineStackProps = Record<
  string,
  ConstructFactory<ResourceProvider>
> & { [K in keyof AmplifyStackBase]?: never };

export type AmplifyStackResources = AmplifyStackBase & {
  [K in keyof DefineStackProps]: Omit<
    ReturnType<DefineStackProps[K]['getInstance']>,
    keyof ResourceAccessAcceptorFactory
  >;
};

class StackGenerator<
  T extends Record<string, ConstructFactory<ResourceProvider>>
> implements ConstructContainerEntryGenerator<AmplifyStackResources>
{
  readonly resourceGroupName: string;

  constructor(
    name: string,
    readonly getInstanceProps: ConstructFactoryGetInstanceProps,
    readonly constructFactories: T
  ) {
    this.resourceGroupName = name;
  }

  generateContainerEntry = ({
    scope,
  }: GenerateContainerEntryProps): ResourceProvider<AmplifyStackResources> => {
    // register providers but don't actually execute anything yet
    Object.values(this.constructFactories).forEach((factory) => {
      if (typeof factory.provides === 'string') {
        this.getInstanceProps.constructContainer.registerConstructFactory(
          factory.provides,
          factory
        );
      }
    });
    // now invoke all the factories and collect the constructs into nestedResources
    const nestedResources: {
      [K in keyof Record<
        string,
        ConstructFactory<ResourceProvider>
      >]: ReturnType<
        Record<string, ConstructFactory<ResourceProvider>>[K]['getInstance']
      >;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = {} as any;
    Object.entries(this.constructFactories).forEach(
      ([resourceName, constructFactory]) => {
        // The type inference on this.resources is not happy about this assignment because it doesn't know the exact type of .getInstance()
        // However, the assignment is okay because we are iterating over the entries of constructFactories and assigning the resource name to the corresponding instance
        nestedResources[
          resourceName as keyof Record<
            string,
            ConstructFactory<ResourceProvider>
          >
        ] = constructFactory.getInstance(
          this.getInstanceProps,
          scope as Stack
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).resources as any;
      }
    );
    return {
      resources: {
        ...nestedResources,
        stack: scope as Stack,
      } as AmplifyStackResources,
    };
  };
}

class StackFactory
  implements ConstructFactory<ResourceProvider<AmplifyStackResources>>
{
  private generator: ConstructContainerEntryGenerator;

  constructor(
    private readonly name: string,
    private readonly constructFactories: DefineStackProps
  ) {}

  getInstance(
    props: ConstructFactoryGetInstanceProps
  ): ResourceProvider<AmplifyStackResources> {
    if (!this.generator) {
      this.generator = new StackGenerator(
        this.name,
        props,
        this.constructFactories
      );
    }
    return props.constructContainer.getOrCompute(
      this.generator
    ) as ResourceProvider<AmplifyStackResources>;
  }
}

/**
 * TODO
 */
export const defineStack = (
  name: string,
  constructFactories: DefineStackProps
): ConstructFactory<ResourceProvider<AmplifyStackResources>> =>
  new StackFactory(name, constructFactories);

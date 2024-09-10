import {
  AmplifyStackResources,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Stack } from 'aws-cdk-lib';

class StackGenerator
  implements ConstructContainerEntryGenerator<AmplifyStackResources>
{
  readonly resourceGroupName: string;

  constructor(name: string) {
    this.resourceGroupName = name;
  }

  generateContainerEntry = ({
    scope,
  }: GenerateContainerEntryProps): ResourceProvider<AmplifyStackResources> => {
    return {
      resources: {
        stack: scope as Stack,
      },
    };
  };
}

class StackFactory
  implements ConstructFactory<ResourceProvider<AmplifyStackResources>>
{
  private generator: ConstructContainerEntryGenerator;

  constructor(private readonly name: string) {}

  getInstance(
    props: ConstructFactoryGetInstanceProps
  ): ResourceProvider<AmplifyStackResources> {
    if (!this.generator) {
      this.generator = new StackGenerator(this.name);
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
  name: string
): ConstructFactory<ResourceProvider<AmplifyStackResources>> =>
  new StackFactory(name);

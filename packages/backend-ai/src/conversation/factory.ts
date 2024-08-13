import { FunctionOutput } from '@aws-amplify/backend-output-schemas';
import {
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  GenerateContainerEntryProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import {
  ConversationHandlerFunction,
  ConversationHandlerFunctionProps,
} from '@aws-amplify/ai-constructs/conversation';

class ConversationHandlerFunctionGenerator
  implements ConstructContainerEntryGenerator
{
  readonly resourceGroupName = 'conversationHandlerFunction';

  constructor(
    private readonly props: DefineConversationHandlerFunctionProps,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>
  ) {}

  generateContainerEntry = ({ scope }: GenerateContainerEntryProps) => {
    return new ConversationHandlerFunction(scope, this.props.name, this.props);
  };
}

class ConversationHandlerFunctionFactory
  implements ConstructFactory<ConversationHandlerFunction>
{
  private generator: ConstructContainerEntryGenerator;

  constructor(private readonly props: DefineConversationHandlerFunctionProps) {}

  getInstance = ({
    constructContainer,
    outputStorageStrategy,
    resourceNameValidator,
  }: ConstructFactoryGetInstanceProps): ConversationHandlerFunction => {
    if (!this.generator) {
      this.generator = new ConversationHandlerFunctionGenerator(
        this.props,
        outputStorageStrategy
      );
    }
    return constructContainer.getOrCompute(
      this.generator
    ) as ConversationHandlerFunction;
  };
}

export type DefineConversationHandlerFunctionProps = {
  name: string;
} & ConversationHandlerFunctionProps;

/**
 * Entry point for defining a conversation handler function in the Amplify ecosystem
 */
export const defineConversationHandlerFunction = (
  props: DefineConversationHandlerFunctionProps
): ConstructFactory<ResourceProvider<FunctionResources>> =>
  new ConversationHandlerFunctionFactory(props);

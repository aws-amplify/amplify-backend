import { FunctionOutput } from '@aws-amplify/backend-output-schemas';
import {
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import {
  ConversationHandler,
  ConversationHandlerProps,
  ConversationHandlerResources,
} from './conversation_handler_construct';

class ConversationHandlerGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName = 'conversationHandler';

  constructor(
    private readonly props: ConversationHandlerFactoryProps,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>
  ) {}

  generateContainerEntry = ({
    scope,
  }: GenerateContainerEntryProps) => {
    return new ConversationHandler(scope, this.props.name, this.props);
  };
}

class ConversationHandlerFactory
  implements ConstructFactory<ConversationHandler>
{
  private generator: ConstructContainerEntryGenerator;

  constructor(private readonly props: ConversationHandlerFactoryProps) {}

  getInstance = ({
    constructContainer,
    outputStorageStrategy,
    resourceNameValidator,
  }: ConstructFactoryGetInstanceProps): ConversationHandler => {
    if (!this.generator) {
      this.generator = new ConversationHandlerGenerator(
        this.props,
        outputStorageStrategy
      );
    }
    return constructContainer.getOrCompute(
      this.generator
    ) as ConversationHandler;
  };
}

export type ConversationHandlerFactoryProps = {
  name: string;
} & ConversationHandlerProps;

/**
 * Entry point for defining a function in the Amplify ecosystem
 */
export const defineConversationHandler = (
  props: ConversationHandlerFactoryProps
): ConstructFactory<ResourceProvider<ConversationHandlerResources>> =>
  new ConversationHandlerFactory(props);

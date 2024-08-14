import {
  FunctionOutput,
  functionOutputKey,
} from '@aws-amplify/backend-output-schemas';
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
import path from 'path';
import { CallerDirectoryExtractor } from '@aws-amplify/platform-core';

class ConversationHandlerFunctionGenerator
  implements ConstructContainerEntryGenerator
{
  readonly resourceGroupName = 'conversationHandlerFunction';

  constructor(
    private readonly props: DefineConversationHandlerFunctionProps,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>
  ) {}

  generateContainerEntry = ({ scope }: GenerateContainerEntryProps) => {
    const conversationHandlerFunction = new ConversationHandlerFunction(
      scope,
      this.props.name,
      this.props
    );
    this.storeOutput(this.outputStorageStrategy, conversationHandlerFunction);
    return conversationHandlerFunction;
  };

  /**
   * Append conversation handler to defined functions.
   * Explicitly defined custom handler is customer's function and should be visible
   * in the outputs.
   */
  private storeOutput = (
    outputStorageStrategy: BackendOutputStorageStrategy<FunctionOutput>,
    conversationHandlerFunction: ConversationHandlerFunction
  ): void => {
    outputStorageStrategy.appendToBackendOutputList(functionOutputKey, {
      version: '1',
      payload: {
        definedFunctions:
          conversationHandlerFunction.resources.lambda.functionName,
      },
    });
  };
}

class ConversationHandlerFunctionFactory
  implements ConstructFactory<ConversationHandlerFunction>
{
  private generator: ConstructContainerEntryGenerator;

  constructor(
    private readonly props: DefineConversationHandlerFunctionProps,
    private readonly callerStack: string | undefined
  ) {}

  getInstance = ({
    constructContainer,
    outputStorageStrategy,
    resourceNameValidator,
  }: ConstructFactoryGetInstanceProps): ConversationHandlerFunction => {
    resourceNameValidator?.validate(this.props.name);
    if (!this.generator) {
      const props = { ...this.props };
      props.entry = this.resolveEntry();
      this.generator = new ConversationHandlerFunctionGenerator(
        props,
        outputStorageStrategy
      );
    }
    return constructContainer.getOrCompute(
      this.generator
    ) as ConversationHandlerFunction;
  };

  private resolveEntry = () => {
    // if entry is not set, default to handler.ts
    if (!this.props.entry) {
      return path.join(
        new CallerDirectoryExtractor(this.callerStack).extract(),
        'handler.ts'
      );
    }

    // if entry is absolute use that
    if (path.isAbsolute(this.props.entry)) {
      return this.props.entry;
    }

    // if entry is relative, compute with respect to the caller directory
    return path.join(
      new CallerDirectoryExtractor(this.callerStack).extract(),
      this.props.entry
    );
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
  new ConversationHandlerFunctionFactory(props, new Error().stack);

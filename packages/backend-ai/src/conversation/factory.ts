import { AIConversationOutput } from '@aws-amplify/backend-output-schemas';
import {
  AmplifyResourceGroupName,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  GenerateContainerEntryProps,
  LogLevel,
  LogRetention,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import {
  ConversationHandlerFunction,
  ConversationHandlerFunctionProps,
  ConversationTurnEventVersion,
} from '@aws-amplify/ai-constructs/conversation';
import path from 'path';
import { CallerDirectoryExtractor } from '@aws-amplify/platform-core';
import { AiModel } from '@aws-amplify/data-schema-types';
import {
  LogLevelConverter,
  LogRetentionConverter,
} from '@aws-amplify/platform-core/cdk';

class ConversationHandlerFunctionGenerator
  implements ConstructContainerEntryGenerator
{
  readonly resourceGroupName: AmplifyResourceGroupName =
    'conversationHandlerFunction';

  constructor(
    private readonly props: DefineConversationHandlerFunctionProps,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<AIConversationOutput>
  ) {}

  generateContainerEntry = ({ scope }: GenerateContainerEntryProps) => {
    const constructProps: ConversationHandlerFunctionProps = {
      entry: this.props.entry,
      models: this.props.models.map((model) => {
        let modelId;
        if (typeof model.modelId === 'string') {
          modelId = model.modelId;
        } else {
          modelId = model.modelId.resourcePath;
        }
        return {
          modelId,
          region: model.region,
        };
      }),
      outputStorageStrategy: this.outputStorageStrategy,
      memoryMB: this.props.memoryMB,
    };
    const logging: typeof constructProps.logging = {};
    if (this.props.logging?.level) {
      logging.level = new LogLevelConverter().toCDKLambdaApplicationLogLevel(
        this.props.logging.level
      );
    }
    if (this.props.logging?.retention) {
      logging.retention = new LogRetentionConverter().toCDKRetentionDays(
        this.props.logging.retention
      );
    }
    constructProps.logging = logging;
    const conversationHandlerFunction = new ConversationHandlerFunction(
      scope,
      this.props.name,
      constructProps
    );
    return conversationHandlerFunction;
  };
}

export type ConversationHandlerFunctionFactory = ConstructFactory<
  ResourceProvider<FunctionResources>
> & {
  readonly eventVersion: ConversationTurnEventVersion;
};

class DefaultConversationHandlerFunctionFactory
  implements ConversationHandlerFunctionFactory
{
  readonly eventVersion: ConversationTurnEventVersion =
    ConversationHandlerFunction.eventVersion;
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

export type ConversationHandlerFunctionLogLevel = LogLevel;

export type ConversationHandlerFunctionLogRetention = LogRetention;

export type ConversationHandlerFunctionLoggingOptions = {
  retention?: ConversationHandlerFunctionLogRetention;
  level?: ConversationHandlerFunctionLogLevel;
};

export type DefineConversationHandlerFunctionProps = {
  name: string;
  entry?: string;
  models: Array<{
    modelId: string | AiModel;
    region?: string;
  }>;
  /**
   * An amount of memory (RAM) to allocate to the function between 128 and 10240 MB.
   * Must be a whole number.
   * Default is 512MB.
   */
  memoryMB?: number;
  logging?: ConversationHandlerFunctionLoggingOptions;
};

/**
 * Entry point for defining a conversation handler function in the Amplify ecosystem
 */
export const defineConversationHandlerFunction = (
  props: DefineConversationHandlerFunctionProps
): ConversationHandlerFunctionFactory =>
  // eslint-disable-next-line amplify-backend-rules/prefer-amplify-errors
  new DefaultConversationHandlerFunctionFactory(props, new Error().stack);

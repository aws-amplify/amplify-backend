import { TestProjectBase } from './test_project_base.js';
import fs from 'fs/promises';
import { createEmptyAmplifyProject } from './create_empty_amplify_project.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { TestProjectCreator } from './test_project_creator.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import { ConversationTurnEvent } from '@aws-amplify/ai-constructs/conversation/runtime';
import { randomUUID } from 'crypto';
import { generateClientConfig } from '@aws-amplify/client-config';
import { AmplifyAuthCredentialsFactory } from '../amplify_auth_credentials_factory.js';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { SemVer } from 'semver';
import crypto from 'node:crypto';
import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from '@apollo/client/core';
import { AUTH_TYPE, createAuthLink } from 'aws-appsync-auth-link';
import { gql } from 'graphql-tag';
import assert from 'assert';
import { NormalizedCacheObject } from '@apollo/client';
import {
  bedrockModelId,
  expectedTemperatureInDataToolScenario,
  expectedTemperaturesInProgrammaticToolScenario,
} from '../test-projects/conversation-handler/amplify/constants.js';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import * as bedrock from '@aws-sdk/client-bedrock-runtime';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';

// TODO: this is a work around
// it seems like as of amplify v6 , some of the code only runs in the browser ...
// see https://github.com/aws-amplify/amplify-js/issues/12751
if (process.versions.node) {
  // node >= 20 now exposes crypto by default. This workaround is not needed: https://github.com/nodejs/node/pull/42083
  if (new SemVer(process.versions.node).major < 20) {
    // @ts-expect-error altering typing for global to make compiler happy is not worth the effort assuming this is temporary workaround
    globalThis.crypto = crypto;
  }
}

type ConversationTurnAppSyncResponse = {
  associatedUserMessageId: string;
  content: string;
  errors?: Array<ConversationTurnError>;
};

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: Array<ConversationMessageContentBlock>;
};

type ConversationMessageContentBlock =
  | bedrock.ContentBlock
  | {
      image: Omit<bedrock.ImageBlock, 'source'> & {
        // Upstream (Appsync) may send images in a form of Base64 encoded strings
        source: { bytes: string };
      };
      // These are needed so that union with other content block types works.
      // See https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-bedrock-runtime/TypeAlias/ContentBlock/.
      text?: never;
      document?: never;
      toolUse?: never;
      toolResult?: never;
      guardContent?: never;
      $unknown?: never;
    };

type CreateConversationMessageChatInput = ConversationMessage & {
  conversationId: string;
  id: string;
  associatedUserMessageId?: string;
};

type ConversationTurnError = {
  errorType: string;
  message: string;
};

type ConversationTurnAppSyncResponseChunk = {
  conversationId: string;
  associatedUserMessageId: string;
  contentBlockIndex: number;
  contentBlockText?: string;
  contentBlockDeltaIndex?: number;
  contentBlockDoneAtIndex?: number;
  contentBlockToolUse?: string;
  stopReason?: string;
  errors?: Array<ConversationTurnError>;
};

/**
 * Creates conversation handler test project.
 */
export class ConversationHandlerTestProjectCreator
  implements TestProjectCreator
{
  readonly name = 'conversation-handler';

  /**
   * Creates project creator.
   */
  constructor(
    private readonly cfnClient: CloudFormationClient = new CloudFormationClient(
      e2eToolingClientConfig
    ),
    private readonly amplifyClient: AmplifyClient = new AmplifyClient(
      e2eToolingClientConfig
    ),
    private readonly lambdaClient: LambdaClient = new LambdaClient(
      e2eToolingClientConfig
    ),
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(
      e2eToolingClientConfig
    ),
    private readonly resourceFinder: DeployedResourcesFinder = new DeployedResourcesFinder()
  ) {}

  createProject = async (e2eProjectDir: string): Promise<TestProjectBase> => {
    const { projectName, projectRoot, projectAmplifyDir } =
      await createEmptyAmplifyProject(this.name, e2eProjectDir);

    const project = new ConversationHandlerTestProject(
      projectName,
      projectRoot,
      projectAmplifyDir,
      this.cfnClient,
      this.amplifyClient,
      this.lambdaClient,
      this.cognitoIdentityProviderClient,
      this.resourceFinder
    );
    await fs.cp(
      project.sourceProjectAmplifyDirURL,
      project.projectAmplifyDirPath,
      {
        recursive: true,
      }
    );
    return project;
  };
}

/**
 * The conversation handler test project.
 */
class ConversationHandlerTestProject extends TestProjectBase {
  readonly sourceProjectDirPath =
    '../../src/test-projects/conversation-handler';

  readonly sourceProjectAmplifyDirSuffix = `${this.sourceProjectDirPath}/amplify`;

  readonly sourceProjectAmplifyDirURL: URL = new URL(
    this.sourceProjectAmplifyDirSuffix,
    import.meta.url
  );

  /**
   * Create a test project instance.
   */
  constructor(
    name: string,
    projectDirPath: string,
    projectAmplifyDirPath: string,
    cfnClient: CloudFormationClient,
    amplifyClient: AmplifyClient,
    private readonly lambdaClient: LambdaClient = new LambdaClient(
      e2eToolingClientConfig
    ),
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(
      e2eToolingClientConfig
    ),
    private readonly resourceFinder: DeployedResourcesFinder = new DeployedResourcesFinder()
  ) {
    super(
      name,
      projectDirPath,
      projectAmplifyDirPath,
      cfnClient,
      amplifyClient
    );
  }

  override async assertPostDeployment(
    backendId: BackendIdentifier
  ): Promise<void> {
    await super.assertPostDeployment(backendId);

    const clientConfig = await generateClientConfig(backendId, '1.1');
    if (!clientConfig.data?.url) {
      throw new Error('Conversation handler project must include data');
    }
    if (!clientConfig.auth) {
      throw new Error('Conversation handler project must include auth');
    }

    const dataUrl = clientConfig.data?.url;
    const authenticatedUserCredentials =
      await new AmplifyAuthCredentialsFactory(
        this.cognitoIdentityProviderClient,
        clientConfig.auth
      ).getNewAuthenticatedUserCredentials();

    const httpLink = new HttpLink({ uri: clientConfig.data.url });
    const link = ApolloLink.from([
      createAuthLink({
        url: clientConfig.data.url,
        region: clientConfig.data.aws_region,
        auth: {
          type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
          jwtToken: authenticatedUserCredentials.accessToken,
        },
      }),
      // see https://github.com/awslabs/aws-mobile-appsync-sdk-js/issues/473#issuecomment-543029072
      httpLink,
    ]);
    const apolloClient = new ApolloClient({
      link,
      cache: new InMemoryCache(),
    });

    await this.executeWithRetry(() =>
      this.assertDefaultConversationHandlerCanExecuteTurn(
        backendId,
        authenticatedUserCredentials.accessToken,
        dataUrl,
        apolloClient,
        false
      )
    );

    await this.executeWithRetry(() =>
      this.assertDefaultConversationHandlerCanExecuteTurn(
        backendId,
        authenticatedUserCredentials.accessToken,
        dataUrl,
        apolloClient,
        true
      )
    );

    await this.executeWithRetry(() =>
      this.assertDefaultConversationHandlerCanExecuteTurn(
        backendId,
        authenticatedUserCredentials.accessToken,
        dataUrl,
        apolloClient,
        false,
        // Simulate eventual consistency
        true
      )
    );

    await this.executeWithRetry(() =>
      this.assertCustomConversationHandlerCanExecuteTurn(
        backendId,
        authenticatedUserCredentials.accessToken,
        dataUrl,
        apolloClient,
        false
      )
    );

    await this.executeWithRetry(() =>
      this.assertCustomConversationHandlerCanExecuteTurn(
        backendId,
        authenticatedUserCredentials.accessToken,
        dataUrl,
        apolloClient,
        true
      )
    );

    await this.executeWithRetry(() =>
      this.assertDefaultConversationHandlerCanExecuteTurnWithDataTool(
        backendId,
        authenticatedUserCredentials.accessToken,
        dataUrl,
        apolloClient,
        false
      )
    );

    await this.executeWithRetry(() =>
      this.assertDefaultConversationHandlerCanExecuteTurnWithDataTool(
        backendId,
        authenticatedUserCredentials.accessToken,
        dataUrl,
        apolloClient,
        true
      )
    );

    await this.executeWithRetry(() =>
      this.assertDefaultConversationHandlerCanExecuteTurnWithClientTool(
        backendId,
        authenticatedUserCredentials.accessToken,
        dataUrl,
        apolloClient,
        false
      )
    );

    await this.executeWithRetry(() =>
      this.assertDefaultConversationHandlerCanExecuteTurnWithClientTool(
        backendId,
        authenticatedUserCredentials.accessToken,
        dataUrl,
        apolloClient,
        true
      )
    );

    await this.executeWithRetry(() =>
      this.assertDefaultConversationHandlerCanExecuteTurnWithImage(
        backendId,
        authenticatedUserCredentials.accessToken,
        dataUrl,
        apolloClient,
        false
      )
    );

    await this.executeWithRetry(() =>
      this.assertDefaultConversationHandlerCanExecuteTurnWithImage(
        backendId,
        authenticatedUserCredentials.accessToken,
        dataUrl,
        apolloClient,
        true
      )
    );

    await this.executeWithRetry(() =>
      this.assertDefaultConversationHandlerCanPropagateError(
        backendId,
        authenticatedUserCredentials.accessToken,
        dataUrl,
        apolloClient,
        true
      )
    );

    await this.executeWithRetry(() =>
      this.assertDefaultConversationHandlerCanPropagateError(
        backendId,
        authenticatedUserCredentials.accessToken,
        dataUrl,
        apolloClient,
        false
      )
    );
  }

  private assertDefaultConversationHandlerCanExecuteTurn = async (
    backendId: BackendIdentifier,
    accessToken: string,
    graphqlApiEndpoint: string,
    apolloClient: ApolloClient<NormalizedCacheObject>,
    streamResponse: boolean,
    withoutMessageAvailableInTheMessageList = false
  ): Promise<void> => {
    const defaultConversationHandlerFunction = (
      await this.resourceFinder.findByBackendIdentifier(
        backendId,
        'AWS::Lambda::Function',
        (name) => name.includes('default')
      )
    )[0];

    const message: CreateConversationMessageChatInput = {
      id: randomUUID().toString(),
      conversationId: randomUUID().toString(),
      role: 'user',
      content: [
        {
          text: 'What is the value of PI?',
        },
      ],
    };

    // send event
    const event: ConversationTurnEvent = {
      conversationId: message.conversationId,
      currentMessageId: message.id,
      graphqlApiEndpoint: graphqlApiEndpoint,
      request: {
        headers: { authorization: accessToken },
      },
      ...this.getCommonEventProperties(streamResponse),
    };

    if (withoutMessageAvailableInTheMessageList) {
      // This tricks conversation handler to think that message is not available in the list.
      // I.e. it simulates eventually consistency read at list operation where item is not yet visible.
      // In this case handler should fall back to lookup by current message id.
      message.conversationId = randomUUID().toString();
    }
    await this.insertMessage(apolloClient, message);

    const response = await this.executeConversationTurn(
      event,
      defaultConversationHandlerFunction,
      apolloClient
    );
    assert.match(response.content, /3\.14/);
  };

  private assertDefaultConversationHandlerCanExecuteTurnWithImage = async (
    backendId: BackendIdentifier,
    accessToken: string,
    graphqlApiEndpoint: string,
    apolloClient: ApolloClient<NormalizedCacheObject>,
    streamResponse: boolean
  ): Promise<void> => {
    const defaultConversationHandlerFunction = (
      await this.resourceFinder.findByBackendIdentifier(
        backendId,
        'AWS::Lambda::Function',
        (name) => name.includes('default')
      )
    )[0];

    const imagePath = resolve(
      fileURLToPath(import.meta.url),
      '..',
      '..',
      '..',
      'src',
      'test-projects',
      'conversation-handler',
      'resources',
      'sample-image.png'
    );

    const imageSource = await fs.readFile(imagePath, 'base64');

    const message: CreateConversationMessageChatInput = {
      id: randomUUID().toString(),
      conversationId: randomUUID().toString(),
      role: 'user',
      content: [
        {
          text: 'What is on the attached image?',
        },
        {
          image: {
            format: 'png',
            source: { bytes: imageSource },
          },
        },
      ],
    };

    // send event
    const event: ConversationTurnEvent = {
      conversationId: message.conversationId,
      currentMessageId: message.id,
      graphqlApiEndpoint: graphqlApiEndpoint,
      request: {
        headers: { authorization: accessToken },
      },
      ...this.getCommonEventProperties(streamResponse),
    };
    await this.insertMessage(apolloClient, message);
    const response = await this.executeConversationTurn(
      event,
      defaultConversationHandlerFunction,
      apolloClient
    );
    // The image contains a logo of AWS. Responses may vary, but they should always contain statements below.
    assert.match(response.content, /logo/);
    assert.match(response.content, /(aws)|(AWS)|(Amazon Web Services)/);
  };

  private assertDefaultConversationHandlerCanExecuteTurnWithDataTool = async (
    backendId: BackendIdentifier,
    accessToken: string,
    graphqlApiEndpoint: string,
    apolloClient: ApolloClient<NormalizedCacheObject>,
    streamResponse: boolean
  ): Promise<void> => {
    const defaultConversationHandlerFunction = (
      await this.resourceFinder.findByBackendIdentifier(
        backendId,
        'AWS::Lambda::Function',
        (name) => name.includes('default')
      )
    )[0];

    const message: CreateConversationMessageChatInput = {
      conversationId: randomUUID().toString(),
      id: randomUUID().toString(),
      role: 'user',
      content: [
        {
          text: 'What is the temperature in Seattle?',
        },
      ],
    };
    await this.insertMessage(apolloClient, message);

    // send event
    const event: ConversationTurnEvent = {
      conversationId: message.conversationId,
      currentMessageId: message.id,
      graphqlApiEndpoint: graphqlApiEndpoint,
      request: {
        headers: { authorization: accessToken },
      },
      toolsConfiguration: {
        dataTools: [
          {
            name: 'thermometer',
            description: 'Provides the current temperature for a given city.',
            inputSchema: {
              json: {
                type: 'object',
                properties: {
                  city: {
                    type: 'string',
                    description: 'string',
                  },
                },
                required: [],
              },
            },
            graphqlRequestInputDescriptor: {
              queryName: 'getTemperature',
              selectionSet: 'value unit',
              propertyTypes: {
                city: 'String',
              },
            },
          },
        ],
      },
      ...this.getCommonEventProperties(streamResponse),
    };
    const response = await this.executeConversationTurn(
      event,
      defaultConversationHandlerFunction,
      apolloClient
    );
    // Assert that tool was used. I.e. that LLM used value returned by the tool.
    assert.match(
      response.content,
      new RegExp(expectedTemperatureInDataToolScenario.toString())
    );
  };

  private assertDefaultConversationHandlerCanExecuteTurnWithClientTool = async (
    backendId: BackendIdentifier,
    accessToken: string,
    graphqlApiEndpoint: string,
    apolloClient: ApolloClient<NormalizedCacheObject>,
    streamResponse: boolean
  ): Promise<void> => {
    const defaultConversationHandlerFunction = (
      await this.resourceFinder.findByBackendIdentifier(
        backendId,
        'AWS::Lambda::Function',
        (name) => name.includes('default')
      )
    )[0];

    const message: CreateConversationMessageChatInput = {
      conversationId: randomUUID().toString(),
      id: randomUUID().toString(),
      role: 'user',
      content: [
        {
          text: 'What is the temperature in Seattle?',
        },
      ],
    };
    await this.insertMessage(apolloClient, message);

    // send event
    const event: ConversationTurnEvent = {
      conversationId: message.conversationId,
      currentMessageId: message.id,
      graphqlApiEndpoint: graphqlApiEndpoint,
      request: {
        headers: { authorization: accessToken },
      },
      toolsConfiguration: {
        clientTools: [
          {
            name: 'thermometer',
            description: 'Provides the current temperature for a given city.',
            inputSchema: {
              json: {
                type: 'object',
                properties: {
                  city: {
                    type: 'string',
                    description: 'string',
                  },
                },
                required: [],
              },
            },
          },
        ],
      },
      ...this.getCommonEventProperties(streamResponse),
    };
    const response = await this.executeConversationTurn(
      event,
      defaultConversationHandlerFunction,
      apolloClient
    );
    // Assert that tool use content blocks are emitted in case LLM selects client tool.
    // The content blocks are string serialized, but not as a proper JSON,
    // hence string matching is employed below to detect some signals that tool use blocks kinds were emitted.
    assert.match(response.content, /toolUse/);
    assert.match(response.content, /toolUseId/);
    // Assert that LLM attempts to pass parameter when asking for tool use.
    assert.match(response.content, /"city":"Seattle"/);
  };

  private executeConversationTurn = async (
    event: ConversationTurnEvent,
    functionName: string,
    apolloClient: ApolloClient<NormalizedCacheObject>
  ): Promise<{
    content: string;
    errors?: Array<ConversationTurnError>;
  }> => {
    console.log(
      `Sending event conversationId=${event.conversationId} currentMessageId=${event.currentMessageId}`
    );
    await this.lambdaClient.send(
      new InvokeCommand({
        FunctionName: functionName,
        Payload: Buffer.from(JSON.stringify(event)),
      })
    );

    // assert that response came back
    if (event.streamResponse) {
      let nextToken: string | undefined;
      const chunks: Array<ConversationTurnAppSyncResponseChunk> = [];
      do {
        const queryResult = await apolloClient.query<{
          listConversationMessageAssistantStreamingResponses: {
            items: Array<ConversationTurnAppSyncResponseChunk>;
            nextToken: string | undefined;
          };
        }>({
          query: gql`
            query ListMessageChunks(
              $conversationId: ID
              $associatedUserMessageId: ID
              $nextToken: String
            ) {
              listConversationMessageAssistantStreamingResponses(
                limit: 1000
                nextToken: $nextToken
                filter: {
                  conversationId: { eq: $conversationId }
                  associatedUserMessageId: { eq: $associatedUserMessageId }
                }
              ) {
                items {
                  associatedUserMessageId
                  contentBlockDeltaIndex
                  contentBlockDoneAtIndex
                  contentBlockIndex
                  contentBlockText
                  contentBlockToolUse
                  conversationId
                  createdAt
                  errors {
                    errorType
                    message
                  }
                  id
                  owner
                  stopReason
                  updatedAt
                }
                nextToken
              }
            }
          `,
          variables: {
            conversationId: event.conversationId,
            associatedUserMessageId: event.currentMessageId,
            nextToken,
          },
          fetchPolicy: 'no-cache',
        });
        nextToken =
          queryResult.data.listConversationMessageAssistantStreamingResponses
            .nextToken;
        chunks.push(
          ...queryResult.data.listConversationMessageAssistantStreamingResponses
            .items
        );
      } while (nextToken);

      assert.ok(chunks);

      if (chunks.length === 1 && chunks[0].errors) {
        return {
          content: '',
          errors: chunks[0].errors,
        };
      }

      chunks.sort((a, b) => {
        // This is very simplified sort by message,block and delta indexes;
        let aValue = 1000 * 1000 * a.contentBlockIndex;
        if (a.contentBlockDeltaIndex) {
          aValue += a.contentBlockDeltaIndex;
        }
        let bValue = 1000 * 1000 * b.contentBlockIndex;
        if (b.contentBlockDeltaIndex) {
          bValue += b.contentBlockDeltaIndex;
        }
        return aValue - bValue;
      });

      const content = chunks.reduce((accumulated, current) => {
        if (current.contentBlockText) {
          accumulated += current.contentBlockText;
        }
        if (current.contentBlockToolUse) {
          accumulated += current.contentBlockToolUse;
        }
        return accumulated;
      }, '');

      return { content };
    }
    const queryResult = await apolloClient.query<{
      listConversationMessageAssistantResponses: {
        items: Array<ConversationTurnAppSyncResponse>;
      };
    }>({
      query: gql`
        query ListMessage($conversationId: ID, $associatedUserMessageId: ID) {
          listConversationMessageAssistantResponses(
            filter: {
              conversationId: { eq: $conversationId }
              associatedUserMessageId: { eq: $associatedUserMessageId }
            }
            limit: 1000
          ) {
            items {
              conversationId
              id
              updatedAt
              createdAt
              content
              errors {
                errorType
                message
              }
              associatedUserMessageId
            }
            nextToken
          }
        }
      `,
      variables: {
        conversationId: event.conversationId,
        associatedUserMessageId: event.currentMessageId,
      },
      fetchPolicy: 'no-cache',
    });
    assert.strictEqual(
      1,
      queryResult.data.listConversationMessageAssistantResponses.items.length
    );
    const response =
      queryResult.data.listConversationMessageAssistantResponses.items[0];

    if (response.errors) {
      return {
        content: '',
        errors: response.errors,
      };
    }

    assert.ok(response.content);
    return { content: response.content };
  };

  private assertCustomConversationHandlerCanExecuteTurn = async (
    backendId: BackendIdentifier,
    accessToken: string,
    graphqlApiEndpoint: string,
    apolloClient: ApolloClient<NormalizedCacheObject>,
    streamResponse: boolean
  ): Promise<void> => {
    const customConversationHandlerFunction = (
      await this.resourceFinder.findByBackendIdentifier(
        backendId,
        'AWS::Lambda::Function',
        (name) => name.includes('custom')
      )
    )[0];

    const message: CreateConversationMessageChatInput = {
      conversationId: randomUUID().toString(),
      id: randomUUID().toString(),
      role: 'user',
      content: [
        {
          text: 'What is the temperature in Seattle and Boston?',
        },
      ],
    };
    await this.insertMessage(apolloClient, message);

    // send event
    const event: ConversationTurnEvent = {
      conversationId: message.conversationId,
      currentMessageId: message.id,
      graphqlApiEndpoint: graphqlApiEndpoint,
      request: {
        headers: { authorization: accessToken },
      },
      ...this.getCommonEventProperties(streamResponse),
    };
    const response = await this.executeConversationTurn(
      event,
      customConversationHandlerFunction,
      apolloClient
    );
    // Assert that tool was used. I.e. LLM used value provided by the tool.
    assert.match(
      response.content,
      new RegExp(
        expectedTemperaturesInProgrammaticToolScenario.Seattle.toString()
      )
    );
    assert.match(
      response.content,
      new RegExp(
        expectedTemperaturesInProgrammaticToolScenario.Boston.toString()
      )
    );
  };

  private assertDefaultConversationHandlerCanPropagateError = async (
    backendId: BackendIdentifier,
    accessToken: string,
    graphqlApiEndpoint: string,
    apolloClient: ApolloClient<NormalizedCacheObject>,
    streamResponse: boolean
  ): Promise<void> => {
    const defaultConversationHandlerFunction = (
      await this.resourceFinder.findByBackendIdentifier(
        backendId,
        'AWS::Lambda::Function',
        (name) => name.includes('default')
      )
    )[0];

    const message: CreateConversationMessageChatInput = {
      id: randomUUID().toString(),
      conversationId: randomUUID().toString(),
      role: 'user',
      content: [
        {
          text: 'What is the value of PI?',
        },
      ],
    };

    // send event
    const event: ConversationTurnEvent = {
      conversationId: message.conversationId,
      currentMessageId: message.id,
      graphqlApiEndpoint: graphqlApiEndpoint,
      request: {
        headers: { authorization: accessToken },
      },
      ...this.getCommonEventProperties(streamResponse),
    };

    // Inject failure
    event.modelConfiguration.modelId = 'invalidId';
    await this.insertMessage(apolloClient, message);

    const response = await this.executeConversationTurn(
      event,
      defaultConversationHandlerFunction,
      apolloClient
    );
    assert.ok(response.errors);
    assert.ok(response.errors[0]);
    assert.strictEqual(response.errors[0].errorType, 'ValidationException');
    assert.match(
      response.errors[0].message,
      /provided model identifier is invalid/
    );
  };

  private insertMessage = async (
    apolloClient: ApolloClient<NormalizedCacheObject>,
    message: CreateConversationMessageChatInput
  ): Promise<void> => {
    await apolloClient.mutate({
      mutation: gql`
        mutation InsertMessage($input: CreateConversationMessageChatInput!) {
          createConversationMessageChat(input: $input) {
            id
          }
        }
      `,
      variables: {
        input: message,
      },
    });
  };

  private getCommonEventProperties = (streamResponse: boolean) => {
    const responseMutation = streamResponse
      ? {
          name: 'createConversationMessageAssistantStreamingResponse',
          inputTypeName:
            'CreateConversationMessageAssistantStreamingResponseInput',
          selectionSet: ['id', 'conversationId', 'createdAt', 'updatedAt'].join(
            '\n'
          ),
        }
      : {
          name: 'createConversationMessageAssistantResponse',
          inputTypeName: 'CreateConversationMessageAssistantResponseInput',
          selectionSet: [
            'id',
            'conversationId',
            'content',
            'owner',
            'createdAt',
            'updatedAt',
          ].join('\n'),
        };
    return {
      streamResponse,
      responseMutation,
      messageHistoryQuery: {
        getQueryName: 'getConversationMessageChat',
        getQueryInputTypeName: 'ID',
        listQueryName: 'listConversationMessageChats',
        listQueryInputTypeName: 'ModelConversationMessageChatFilterInput',
      },
      modelConfiguration: {
        modelId: bedrockModelId,
        systemPrompt: 'You are helpful bot.',
      },
    };
  };

  /**
   * Bedrock sometimes produces empty response or half backed response.
   * On the other hand we have to run some assertions on those responses.
   * Therefore, we wrap transactions in retry loop.
   */
  private executeWithRetry = async (
    callable: () => Promise<void>,
    maxAttempts = 3
  ) => {
    const collectedErrors = [];
    for (let i = 1; i <= maxAttempts; i++) {
      try {
        await callable();
        // if successful return early;
        return;
      } catch (e) {
        collectedErrors.push(e);
      }
    }
    // if we got here there were only errors
    throw new AggregateError(collectedErrors);
  };
}

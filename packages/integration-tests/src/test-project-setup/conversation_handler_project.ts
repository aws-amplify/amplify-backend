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

const commonEventProperties = {
  responseMutation: {
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
  },
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
    private readonly cfnClient: CloudFormationClient,
    private readonly amplifyClient: AmplifyClient,
    private readonly lambdaClient: LambdaClient,
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient,
    private readonly resourceFinder: DeployedResourcesFinder
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
    private readonly lambdaClient: LambdaClient,
    private readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient,
    private readonly resourceFinder: DeployedResourcesFinder
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

    await this.assertDefaultConversationHandlerCanExecuteTurn(
      backendId,
      authenticatedUserCredentials.accessToken,
      clientConfig.data.url,
      apolloClient
    );

    await this.assertDefaultConversationHandlerCanExecuteTurn(
      backendId,
      authenticatedUserCredentials.accessToken,
      clientConfig.data.url,
      apolloClient,
      // Simulate eventual consistency
      true
    );

    await this.assertCustomConversationHandlerCanExecuteTurn(
      backendId,
      authenticatedUserCredentials.accessToken,
      clientConfig.data.url,
      apolloClient
    );

    await this.assertDefaultConversationHandlerCanExecuteTurnWithDataTool(
      backendId,
      authenticatedUserCredentials.accessToken,
      clientConfig.data.url,
      apolloClient
    );

    await this.assertDefaultConversationHandlerCanExecuteTurnWithClientTool(
      backendId,
      authenticatedUserCredentials.accessToken,
      clientConfig.data.url,
      apolloClient
    );

    await this.assertDefaultConversationHandlerCanExecuteTurnWithImage(
      backendId,
      authenticatedUserCredentials.accessToken,
      clientConfig.data.url,
      apolloClient
    );
  }

  private assertDefaultConversationHandlerCanExecuteTurn = async (
    backendId: BackendIdentifier,
    accessToken: string,
    graphqlApiEndpoint: string,
    apolloClient: ApolloClient<NormalizedCacheObject>,
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
      ...commonEventProperties,
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
    apolloClient: ApolloClient<NormalizedCacheObject>
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
      ...commonEventProperties,
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
    apolloClient: ApolloClient<NormalizedCacheObject>
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
      ...commonEventProperties,
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
    apolloClient: ApolloClient<NormalizedCacheObject>
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
      ...commonEventProperties,
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

  private assertCustomConversationHandlerCanExecuteTurn = async (
    backendId: BackendIdentifier,
    accessToken: string,
    graphqlApiEndpoint: string,
    apolloClient: ApolloClient<NormalizedCacheObject>
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
          text: 'What is the temperature in Seattle, Boston and Miami?',
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
      ...commonEventProperties,
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
    assert.match(
      response.content,
      new RegExp(
        expectedTemperaturesInProgrammaticToolScenario.Miami.toString()
      )
    );
  };

  private executeConversationTurn = async (
    event: ConversationTurnEvent,
    functionName: string,
    apolloClient: ApolloClient<NormalizedCacheObject>
  ): Promise<ConversationTurnAppSyncResponse> => {
    await this.lambdaClient.send(
      new InvokeCommand({
        FunctionName: functionName,
        Payload: Buffer.from(JSON.stringify(event)),
      })
    );

    // assert that response came back

    const queryResult = await apolloClient.query<{
      listConversationMessageAssistantResponses: {
        items: Array<ConversationTurnAppSyncResponse>;
      };
    }>({
      query: gql`
        query ListMessages {
          listConversationMessageAssistantResponses(limit: 1000) {
            items {
              conversationId
              id
              updatedAt
              createdAt
              content
              associatedUserMessageId
            }
          }
        }
      `,
      fetchPolicy: 'no-cache',
    });
    const response =
      queryResult.data.listConversationMessageAssistantResponses.items.find(
        (item) => item.associatedUserMessageId === event.currentMessageId
      );
    assert.ok(response);
    return response;
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
}

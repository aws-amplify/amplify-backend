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

    const clientConfig = await generateClientConfig(backendId, '1');
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
  }

  private assertDefaultConversationHandlerCanExecuteTurn = async (
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

    // send event
    const event: ConversationTurnEvent = {
      conversationId: randomUUID().toString(),
      currentMessageId: randomUUID().toString(),
      graphqlApiEndpoint: graphqlApiEndpoint,
      messages: [
        {
          role: 'user',
          content: [
            {
              text: 'How are you?',
            },
          ],
        },
      ],
      request: {
        headers: { authorization: accessToken },
      },
      responseMutationInputTypeName:
        'CreateConversationMessageAssistantResponseInput',
      responseMutationName: 'createConversationMessageAssistantResponse',
      modelConfiguration: {
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        systemPrompt: 'You are helpful bot.',
      },
    };
    await this.executeConversationTurn(
      event,
      defaultConversationHandlerFunction,
      apolloClient
    );
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

    // send event
    const event: ConversationTurnEvent = {
      conversationId: randomUUID().toString(),
      currentMessageId: randomUUID().toString(),
      graphqlApiEndpoint: graphqlApiEndpoint,
      messages: [
        {
          role: 'user',
          content: [
            {
              text: 'What is the temperature in Seattle?',
            },
          ],
        },
      ],
      request: {
        headers: { authorization: accessToken },
      },
      responseMutationInputTypeName:
        'CreateConversationMessageAssistantResponseInput',
      responseMutationName: 'createConversationMessageAssistantResponse',
      modelConfiguration: {
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        systemPrompt: 'You are helpful bot.',
      },
      toolsConfiguration: {
        tools: [
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
              selectionSet: ['value', 'unit'],
              propertyTypes: {
                city: 'String',
              },
            },
          },
        ],
      },
    };
    const response = await this.executeConversationTurn(
      event,
      defaultConversationHandlerFunction,
      apolloClient
    );
    // Assert that tool was used.
    assert.match(response.content, /85/);
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

    // send event
    const event: ConversationTurnEvent = {
      conversationId: randomUUID().toString(),
      currentMessageId: randomUUID().toString(),
      graphqlApiEndpoint: graphqlApiEndpoint,
      messages: [
        {
          role: 'user',
          content: [
            {
              text: 'What is the temperature in Seattle?',
            },
          ],
        },
      ],
      request: {
        headers: { authorization: accessToken },
      },
      responseMutationInputTypeName:
        'CreateConversationMessageAssistantResponseInput',
      responseMutationName: 'createConversationMessageAssistantResponse',
      modelConfiguration: {
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        systemPrompt: 'You are helpful bot.',
      },
    };
    const response = await this.executeConversationTurn(
      event,
      customConversationHandlerFunction,
      apolloClient
    );
    // Assert that tool was used.
    assert.match(response.content, /75/);
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
          listConversationMessageAssistantResponses {
            items {
              conversationId
              sender
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
}

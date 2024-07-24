import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

export const handler = async (event: ConversationEventInput, context: any) => {
  console.log('Received event and context');
  console.log(event);
  console.log(context);
  const { modelId, graphqlApiEndpoint, systemPrompt } = event.args;
  const authHeader = event.request.headers.authorization;
  const messages = event.prev.result.items;

  // Make /converse request
  const bedrock = new BedrockRuntimeClient({
    region: 'us-west-2',
  });

  const bedrockResponse = await bedrock.send(
    new ConverseCommand({
      modelId,
      messages,
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        maxTokens: 2000,
        temperature: 0,
      },
    })
  );
  const assistantResponse = bedrockResponse.output?.message?.content?.[0].text;
  if (!assistantResponse) {
    throw new Error('foo');
  }

  // Construct mutation event sending assistant response to AppSync
  const query = assistantResponseMutation(event.args);
  const variables = assistantResponseInput(event.args, assistantResponse);
  const options = assistantResponseRequestOptions(authHeader, query, variables);
  const request = new Request(graphqlApiEndpoint, options);

  try {
    console.log('Responding with:');
    console.log(request);
    const res = await fetch(request);
    const body = await res.json();
    console.log(body);
  } catch (error) {
    console.log(error);
  }
};

const assistantResponseRequestOptions = (
  authHeader: string,
  query: string,
  variables: AssistantMutationResponseInput
): RequestInit => {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/graphql',
      Authorization: authHeader,
    },
    body: JSON.stringify({ query, variables }),
  };
};

const assistantResponseInput = (
  args: Args,
  content: string
): AssistantMutationResponseInput => {
  return {
    input: {
      conversationId: args.sessionId,
      content,
      associatedUserMessageId: args.currentMessageId,
    },
  };
};

const assistantResponseMutation = (args: Args): string => {
  const { responseMutationInputTypeName, responseMutationName } = args;
  return `
        mutation PublishModelResponse($input: ${responseMutationInputTypeName}!) {
            ${responseMutationName}(input: $input) {
                id
                sessionId
                content
                sender
                owner
            }
        }
    `;
};

type Message = {
  role: 'user' | 'assistant';
  content: { text: string }[];
};

type Claims = {
  sub: string;
  email_verified: boolean;
  iss: string;
};

type Identity = {
  defaultAuthStrategy: 'ALLOW' | 'DENY';
  sub: string;
  username: string;
  claims: Claims;
};

type Headers = {
  authorization: string;
};

type Request = {
  headers: Headers;
};

// TODO: change to actual shape.
type Content = string;

type Args = {
  sessionId: string;
  content: Content;
  owner: string;
  modelId: string;
  responseMutationName: string;
  responseMutationInputTypeName: string;
  graphqlApiEndpoint: string;
  currentMessageId: string;
  systemPrompt: string;
};

type ConversationEventInput = {
  typeName: string;
  fieldName: string;
  args: Args;
  identity: Identity;
  request: Request;
  prev: { result: { items: Message[] } };
};

type AssistantMutationResponseInput = {
  input: {
    conversationId: string;
    content: string;
    associatedUserMessageId: string;
  };
};

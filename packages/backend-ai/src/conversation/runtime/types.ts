export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: Array<ConversationMessageContentBlock>;
};

export type ConversationMessageContentBlock = {
  text: string;
};

export type ConversationTurnEvent = {
  sessionId: string;
  currentMessageId: string;
  responseMutationName: string;
  responseMutationInputTypeName: string;
  graphqlApiEndpoint: string;
  modelConfiguration: {
    modelId: string;
    systemPrompt: string;
  };
  request: {
    headers: {
      authorization: string;
    };
  };
  previousMessages: Array<ConversationMessage>;
};

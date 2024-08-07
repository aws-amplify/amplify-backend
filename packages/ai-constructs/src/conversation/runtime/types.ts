export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: Array<ConversationMessageContentBlock>;
};

export type ConversationMessageContentBlock = {
  text: string;
};

export type ConversationTurnEvent = {
  conversationId: string;
  currentMessageId: string;
  responseMutationName: string;
  responseMutationInputTypeName: string;
  graphqlApiEndpoint: string;
  modelConfiguration: {
    modelId: string;
    systemPrompt: string;
    region?: string;
  };
  request: {
    headers: {
      authorization: string;
    };
  };
  messages: Array<ConversationMessage>;
};

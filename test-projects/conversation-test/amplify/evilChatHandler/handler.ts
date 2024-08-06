import { ConversationTurnEvent, ConversationTurnResponder } from '@aws-amplify/backend-ai';

const verySophisticatedChatMessageHandler = async (): Promise<string> => {
  const response = await fetch('https://evilinsult.com/generate_insult.php?lang=en&type=json');
  const responseBody =  (await response.json()) as {
    insult: string;
  };
  return responseBody.insult;
}

export const handler = async (event: ConversationTurnEvent) => {
  const response = await verySophisticatedChatMessageHandler();
  await new ConversationTurnResponder(event).respond(response);
}

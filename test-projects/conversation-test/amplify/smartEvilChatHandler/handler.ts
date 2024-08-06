import {
  ConversationTurnEvent,
  ConversationTurnExecutor,
  Tool,
} from '@aws-amplify/backend-ai';

const fetchSomeInsult = async (): Promise<string> => {
  const response = await fetch(
    'https://evilinsult.com/generate_insult.php?lang=en&type=json'
  );
  const responseBody = (await response.json()) as {
    insult: string;
  };
  return responseBody.insult;
};

const additionalTools: Array<Tool> = [
  {
    name: 'InsultGenerator',
    description: 'Generates random insult',
    inputSchema: {
      json: {
        type: 'object',
      },
    },
    execute: async () => {
      const insult = await fetchSomeInsult();
      return {
        text: insult,
      };
    },
  },
];

export const handler = async (event: ConversationTurnEvent) => {
  const turnExecutor = new ConversationTurnExecutor(event, additionalTools);
  await turnExecutor.execute();
};

import {
  BedrockConverseAdapter,
  ConversationTurnEvent,
  ConversationTurnResponder,
} from '@aws-amplify/backend-ai';
import _ from 'lodash';

export const handler = async (event: ConversationTurnEvent) => {
  const pirateEvent = _.cloneDeep(event);
  pirateEvent.args.systemPrompt =
    'You are a helpful chatbot that responds in the voice and tone of a pirate. Respond in 40 words or less.';
  pirateEvent.args.modelId = 'anthropic.claude-3-haiku-20240307-v1:0';
  const normalEvent = _.cloneDeep(event);
  normalEvent.args.systemPrompt =
    'You are a helpful chatbot. Respond in 40 words or less.';
  normalEvent.args.modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';

  const converseAdapterNormal = new BedrockConverseAdapter(normalEvent);
  const converseAdapterPirate = new BedrockConverseAdapter(pirateEvent);
  const normalResponse = await converseAdapterNormal.askBedrock();
  const pirateResponse = await converseAdapterPirate.askBedrock();

  let finalResponse: string;
  if (Math.random() < 0.5) {
    finalResponse = `\u{1F3F4} ${pirateResponse}`;
  } else {
    finalResponse = `${normalResponse}`;
  }

  await new ConversationTurnResponder(event).respond(finalResponse);
};

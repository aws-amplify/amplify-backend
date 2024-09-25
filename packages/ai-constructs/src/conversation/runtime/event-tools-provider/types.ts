import { ConversationTurnEvent } from '../types';

export type ConversationTurnEventToolConfiguration = NonNullable<
  NonNullable<ConversationTurnEvent['toolsConfiguration']>['dataTools']
>[number];

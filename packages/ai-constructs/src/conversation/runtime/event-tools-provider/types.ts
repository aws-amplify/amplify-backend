import { ConversationTurnEvent } from '../types';

export type ConversationTurnEventToolConfiguration = NonNullable<
  ConversationTurnEvent['toolsConfiguration']
>['tools'][number];

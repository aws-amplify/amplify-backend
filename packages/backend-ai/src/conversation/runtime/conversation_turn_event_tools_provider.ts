import { ConversationTurnEvent, Tool } from './types';

/**
 * TODO docs
 */
export class ConversationTurnEventToolsProvider {
  /**
   * TODO docs
   */
  constructor(private readonly event: ConversationTurnEvent) {}

  getEventTools = (): Array<Tool> => {
    // TODO here comes logic that maps event tools into our abstraction.
    return [];
  };
}

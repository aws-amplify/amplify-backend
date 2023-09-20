export type OnEventCallback = () => Promise<void>;
/**
 * Manages events
 */
export class EventHandler<T extends string> {
  private events: Partial<Record<T, OnEventCallback[]>> = {};
  protected emit = async (event: T): Promise<void> => {
    const events = this.events[event] ?? [];
    await Promise.all(events.map((handler) => handler()));
  };
  public on = (event: T, handler: OnEventCallback) => {
    this.events[event] ??= [];
    this.events[event]?.push(handler);
  };
}

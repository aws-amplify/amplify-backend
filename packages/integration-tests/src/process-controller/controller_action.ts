/**
 * Contains a predicate that the process controller should wait for, then strings that should be sent after the predicate matches
 */
export type ControllerAction = {
  predicate: (line: string) => boolean;
  /**
   * String that should be sent once the predicate is true
   *
   * If we need to do things like send multiple keystrokes in response to a single prompt, we will likely need to expand this to an array of values to send
   */
  thenSend?: string;
};

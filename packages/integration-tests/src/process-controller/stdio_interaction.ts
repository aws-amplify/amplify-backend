/**
 * Contains a predicate that the process controller should wait for on stdout, then an optional string that should be sent on stdin after the predicate matches
 */
export type StdioInteraction = {
  predicate: (line: string) => boolean;
  /**
   * String that should be sent once the predicate is true
   *
   * If we need to do things like send multiple keystrokes in response to a single prompt, we will likely need to expand this to an array of values to send
   */
  payload?: string;
};

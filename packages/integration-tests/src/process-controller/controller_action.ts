/**
 * Contains a predicate that the process controller should wait for, then strings that should be sent after the predicate matches
 */
export type ControllerAction = {
  predicate: (line: string) => boolean;
  thenSend: string[];
};

/**
 * Contains a line predicate to wait for with strings that should be sent after the predicate matches
 */
export type LineAction = {
  predicate: (line: string) => boolean;
  thenSend: string[];
};

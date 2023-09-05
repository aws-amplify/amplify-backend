export type LineAction = {
  predicate: (line: string) => boolean;
  thenSend: string[];
};

export const hydrateTokens = <T extends Record<string, unknown>>(obj: T, tokens: Record<string, string>): T => {
  const stack: Record<string, unknown>[] = [];
  stack.push(obj);
  while (stack.length > 0) {
    const curr = stack.pop()!;
    if (typeof curr === "object") {
      // array or record
      Object.entries(curr).forEach(([key, value]) => {
        if (typeof value === "object") {
          stack.push(value as T);
        } else if (typeof value === "string") {
          maybeStringSub(value, tokens, (newValue: string) => {
            curr[key] = newValue;
          });
        }
      });
    }
  }
  return obj;
};

const maybeStringSub = (element: string, tokens: Record<string, string>, substitutionCallback: (newValue: string) => void) => {
  if (element.startsWith("$param:")) {
    const [, tokenKey] = element.split(":");
    if (!tokens[tokenKey]) {
      throw new Error(`Provided tokens did not include ${tokenKey}`);
    }
    substitutionCallback(tokens[tokenKey]);
  }
};

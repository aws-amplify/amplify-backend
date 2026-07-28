// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/** Max number of inbound user-agent pairs propagated onward. */
const MAX_PAIRS = 6;
/** Max length of a propagated name or version. */
const MAX_TOKEN_LENGTH = 64;

/**
 * The inbound caller's user-agent pairs for the invocation currently being
 * handled. Module scope is deliberate: the propagating middleware is attached to
 * each client ONCE (see {@link withInboundUserAgent}) and reads this slot at
 * request time, which avoids re-registering middleware per invocation.
 *
 * A Lambda container handles ONE invocation at a time, so there is no
 * cross-request interleaving; {@link setInboundUserAgent} nonetheless always
 * resets the slot so a user-agent-less request can never inherit the previous
 * caller's value.
 *
 * This invariant depends on every SDK call in the handler being fully awaited
 * before the handler returns — do NOT add fire-and-forget calls downstream of
 * {@link setInboundUserAgent}. Lambda can freeze the environment as soon as the
 * handler's promise settles and resume a dangling promise during the NEXT
 * invocation, by which point this slot describes a different caller.
 */
let inboundUserAgent: Array<[string, string]> = [];

/**
 * Parse the inbound `x-amz-user-agent` into user-agent pairs and store them for
 * the current invocation. Tokens are whitespace-separated and split on their
 * FIRST `/` into `[name, version]` (a token with no `/` becomes
 * `[token, '']`), capped to {@link MAX_PAIRS} pairs with each name and version
 * truncated to {@link MAX_TOKEN_LENGTH} characters so a hostile client cannot
 * inflate the outgoing header.
 *
 * These caps are this module's own hardening; the SDK additionally escapes every
 * pair against its own character allowlist before writing the header, so any
 * character outside it (including CR/LF) becomes `-` and cannot forge header
 * structure. Note this also rewrites a `/` inside a version, so a slash does not
 * survive to the wire even though the parser preserves it here.
 *
 * MUST be called at the top of every invocation, before any SDK call, INCLUDING
 * when the header is absent: it always resets first, so passing `undefined`
 * clears any value left over from a previous warm invocation.
 */
export const setInboundUserAgent = (raw?: string): void => {
  inboundUserAgent = [];
  if (!raw) {
    return;
  }
  const pairs: Array<[string, string]> = [];
  for (const token of raw.split(/\s+/)) {
    if (pairs.length >= MAX_PAIRS) {
      break;
    }
    if (!token) {
      continue;
    }
    const separator = token.indexOf('/');
    const name = (separator === -1 ? token : token.slice(0, separator)).slice(
      0,
      MAX_TOKEN_LENGTH,
    );
    const version =
      separator === -1
        ? ''
        : token.slice(separator + 1, separator + 1 + MAX_TOKEN_LENGTH);
    if (!name) {
      continue;
    }
    pairs.push([name, version]);
  }
  inboundUserAgent = pairs;
};

/** The pairs currently staged for propagation (exposed for assertions). */
export const getInboundUserAgent = (): Array<[string, string]> =>
  inboundUserAgent.map(([name, version]) => [name, version]);

/** The one field of the SDK handler-execution context this module writes. */
type UserAgentContext = { userAgent?: Array<[string, string]> };

/**
 * The single `middlewareStack.add` overload this module needs. The SDK's real
 * `add` is heavily overloaded per step, so the stack is narrowed to this shape
 * rather than importing `@smithy/types` (only a transitive dependency here).
 */
type BuildStepStack = {
  add: (
    middleware: (
      next: (args: unknown) => unknown,
      context: UserAgentContext,
    ) => (args: unknown) => unknown,
    options: { step: 'build'; name: string; override: boolean },
  ) => void;
};

/**
 * Attach the inbound-user-agent propagator to an SDK v3 client, returning the
 * same client for convenient inline use at construction.
 *
 * The middleware appends the inbound caller's pairs to `context.userAgent`,
 * which is the SUPPORTED extension point: the SDK's own user-agent middleware
 * (`build` step, `low` priority) reads `context.userAgent` and folds it into the
 * outgoing header. Writing `request.headers['x-amz-user-agent']` directly does
 * NOT work — that same middleware unconditionally overwrites the header — so it
 * must not be used.
 *
 * Call this ONCE per client, at module scope alongside the client construction,
 * so middleware never accumulates across warm invocations.
 */
export const withInboundUserAgent = <
  ClientType extends { middlewareStack: unknown },
>(
  client: ClientType,
): ClientType => {
  const stack = client.middlewareStack as BuildStepStack;
  // The cast above cannot be checked by the compiler (the SDK's `add` is
  // overloaded per step), so fail loudly at module load if a future SDK version
  // changes the shape, rather than deep inside a cold-start request.
  if (typeof stack?.add !== 'function') {
    throw new Error(
      'Cannot propagate the inbound user agent: the AWS SDK client has no middlewareStack.add',
    );
  }
  stack.add(
    (next, context) => (args) => {
      context.userAgent = [
        ...(context.userAgent ?? []),
        ...getInboundUserAgent(),
      ];
      return next(args);
    },
    {
      step: 'build',
      name: 'amplify-inbound-user-agent-propagator',
      override: true,
    },
  );
  return client;
};

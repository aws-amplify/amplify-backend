// Round-trip POST handler. Used by deployment tests to prove the SSR origin
// (REST API + STREAM) accepts non-empty bodies — regression coverage for
// the OAC + Function URL body-hash bug.
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  return {
    ok: true,
    method: 'POST',
    contentType: getRequestHeader(event, 'content-type') ?? null,
    body,
  };
});

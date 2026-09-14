export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store');
  return { status: 'ok', timestamp: Date.now() };
});

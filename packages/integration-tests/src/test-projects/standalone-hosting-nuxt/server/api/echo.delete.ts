export default defineEventHandler((event) => {
  return {
    ok: true,
    method: 'DELETE',
    query: getQuery(event),
  };
});

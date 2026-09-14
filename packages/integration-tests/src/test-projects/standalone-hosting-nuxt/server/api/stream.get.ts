// 10 chunks at 100 ms intervals. Verifies streaming is preserved end-to-end
// (CloudFront → API Gateway STREAM → Lambda streamifyResponse) for Nuxt.
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8');
  setResponseHeader(event, 'cache-control', 'no-store');
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      for (let i = 1; i <= 10; i++) {
        controller.enqueue(enc.encode(`chunk-${i} ts=${Date.now()}\n`));
        await new Promise((r) => setTimeout(r, 100));
      }
      controller.close();
    },
  });
  return sendStream(event, stream);
});

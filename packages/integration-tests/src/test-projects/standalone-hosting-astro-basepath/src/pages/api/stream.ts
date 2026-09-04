import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 3; i++) {
        controller.enqueue(encoder.encode(`chunk-${i}\n`));
        await new Promise((r) => setTimeout(r, 50));
      }
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  });
};

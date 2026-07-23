import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  return new Response(JSON.stringify({ echoed: body, length: body.length }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

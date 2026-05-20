import { NextResponse } from 'next/server';

// 10 chunks at 100 ms intervals — used by deployment tests to verify
// streaming is preserved end-to-end (CloudFront → API Gateway STREAM
// → Lambda streamifyResponse).

export const dynamic = 'force-dynamic';

export async function GET() {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 1; i <= 10; i++) {
        controller.enqueue(enc.encode(`chunk-${i} ts=${Date.now()}\n`));
        await new Promise((r) => setTimeout(r, 100));
      }
      controller.close();
    },
  });
  return new NextResponse(stream, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-stream': 'readablestream',
    },
  });
}

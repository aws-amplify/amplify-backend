import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    {
      CUSTOM_TEST_VAR: process.env.CUSTOM_TEST_VAR ?? 'NOT_SET',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

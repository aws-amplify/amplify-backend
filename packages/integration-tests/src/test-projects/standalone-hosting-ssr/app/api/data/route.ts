import { NextResponse } from 'next/server';
import { getAmplifyConfig, queryGraphQL } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getAmplifyConfig();

  if (!config.data?.url || !config.data?.api_key) {
    return NextResponse.json(
      { error: 'Backend not configured', configured: false },
      { status: 503 },
    );
  }

  try {
    const result = await queryGraphQL(
      config.data.url,
      config.data.api_key,
      '{ listTodos { items { id content } } }',
    );

    return NextResponse.json({
      configured: true,
      data: result.data,
      errors: result.errors,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message, configured: true },
      { status: 500 },
    );
  }
}

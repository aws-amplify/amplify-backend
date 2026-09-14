import { getAmplifyConfig } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const config = getAmplifyConfig();
  const hasAuth = Boolean(config.auth?.user_pool_id);

  return (
    <main>
      <h1>Dashboard</h1>
      <p>This is a dynamic server-rendered page.</p>
      <p data-testid="auth-configured">
        {hasAuth ? 'auth-ready' : 'auth-not-configured'}
      </p>
      <p data-testid="rendered-at">{new Date().toISOString()}</p>
      <a href="/">Back to Home</a>
    </main>
  );
}

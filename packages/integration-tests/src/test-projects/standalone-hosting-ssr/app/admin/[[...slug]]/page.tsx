export const dynamic = 'force-dynamic';

export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const path = slug?.join('/') ?? '';
  return (
    <main>
      <h1>Admin</h1>
      <p data-testid="admin-path">{path}</p>
    </main>
  );
}

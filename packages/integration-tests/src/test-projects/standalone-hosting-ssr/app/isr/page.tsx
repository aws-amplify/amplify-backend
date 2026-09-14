export const revalidate = 10;

export default function IsrPage() {
  const timestamp = Date.now();
  return (
    <main>
      <h1>Hello SSR v1</h1>
      <p>{`ISR page generated at: ${timestamp}`}</p>
      <p>This page uses Incremental Static Regeneration.</p>
      <a href="/">Back to Home</a>
    </main>
  );
}

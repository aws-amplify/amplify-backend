export const revalidate = 10;

export default function IsrPage() {
  return (
    <main>
      <h1>Hello SSR v1</h1>
      <p>ISR page generated at: {Date.now()}</p>
      <p>This page uses Incremental Static Regeneration.</p>
      <a href="/">Back to Home</a>
    </main>
  );
}

export const revalidate = 1;

export default function IsrPage() {
  return (
    <main>
      <h1>ISR Page</h1>
      <p>ISR page generated at: {Date.now()}</p>
      <p>This page uses Incremental Static Regeneration with a 1-second revalidation interval.</p>
      <a href="/">Back to Home</a>
    </main>
  );
}

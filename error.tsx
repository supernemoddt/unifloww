"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth">
      <h1>Something went wrong</h1>
      <p>Your saved work is safe. Try loading the workspace again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}

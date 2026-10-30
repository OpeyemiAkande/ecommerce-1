"use client";

export default function ErrorPage({reset}: {error: Error; reset: () => void}) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-neutral-600">
        We couldn&apos;t load this page. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded bg-neutral-900 px-4 py-2 text-white"
      >
        Try again
      </button>
    </div>
  );
}

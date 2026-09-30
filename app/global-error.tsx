'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Application Error</h2>
        <p className="text-gray-400 mb-4">{error?.message || 'A critical error occurred.'}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-indigo-600 rounded-lg text-white font-medium hover:bg-indigo-500"
        >
          Try again
        </button>
      </body>
    </html>
  );
}

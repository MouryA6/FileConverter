export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-semibold">About All Files Convertor</h1>
      <div className="mt-8 space-y-5 leading-7 text-zinc-300">
        <p>
          All Files Convertor exists because file conversion should be fast, practical, and private by default. The
          product is built around a simple promise: process the file, return the result, and clean up temporary data.
        </p>
        <p>
          Batch conversion runs multiple files in parallel with guardrails for size, output, rate limits, and cleanup so the
          service stays reliable.
        </p>
      </div>
    </main>
  );
}

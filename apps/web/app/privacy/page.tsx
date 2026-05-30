export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-semibold">Privacy Policy</h1>
      <div className="mt-8 space-y-5 leading-7 text-zinc-300">
        <p>All Files Convertor processes files in isolated containers and never writes uploads to permanent storage.</p>
        <p>Converted files are purged when a download completes, and completed jobs expire after the configured job cleanup window.</p>
        <p>Abandoned temporary processing folders are removed by a scheduled cleanup process. Local defaults keep completed jobs for 10 minutes and abandoned temp folders for up to 60 minutes.</p>
        <p>No file contents are logged. IP addresses may be used for rate limiting and operational protection, then purged or expired within 24 hours.</p>
        <p>For production rate limiting, IP addresses are hashed before being stored in Redis with a short expiry window.</p>
        <p>AdSense may set cookies for advertising. All Files Convertor does not sell personal data to third parties.</p>
      </div>
    </main>
  );
}

import Link from "next/link";
import { Github } from "lucide-react";

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/76 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          All Files Convertor
        </Link>
        <div className="hidden items-center gap-7 text-sm text-zinc-300 sm:flex">
          <Link href="/#tools" className="hover:text-white">
            All tools
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/api-docs" className="hover:text-white">
            API
          </Link>
        </div>
        <a
          href="https://github.com"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface hover:border-accent"
          aria-label="GitHub"
        >
          <Github className="h-4 w-4" />
        </a>
      </nav>
    </header>
  );
}

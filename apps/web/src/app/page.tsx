'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="border-primary/20 bg-primary/5 text-primary mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
            <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
          </span>
          Now in Development
        </div>

        <h1 className="from-foreground to-foreground/70 mb-6 bg-gradient-to-b bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl md:text-7xl">
          Your Entire Life,
          <br />
          <span className="from-primary bg-gradient-to-r to-purple-500 bg-clip-text text-transparent">
            Securely Organized
          </span>
        </h1>

        <p className="text-muted-foreground mb-10 max-w-2xl text-lg sm:text-xl">
          LifeLedger is an AI-powered platform to store, organize, search, and manage all your
          important life records — identity, medical, financial, legal, and more — in one secure
          place.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href={isAuthenticated ? '/dashboard' : '/register'}
            className="bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/30 inline-flex h-12 items-center justify-center rounded-lg px-8 text-base font-semibold shadow-lg transition-all hover:shadow-xl"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
          </Link>
          <Link
            href="/about"
            className="border-border bg-background hover:bg-accent inline-flex h-12 items-center justify-center rounded-lg border px-8 text-base font-semibold transition-all"
          >
            Learn More
          </Link>
        </div>

        {/* Feature Pills */}
        <div className="mt-16 flex flex-wrap justify-center gap-3">
          {[
            '🪪 Identity Docs',
            '🏥 Medical Records',
            '🎓 Education',
            '💰 Financial',
            '🛡️ Insurance',
            '🏠 Property',
            '⚖️ Legal',
            '🚨 Emergency',
            '📜 Digital Legacy',
          ].map((feature) => (
            <span
              key={feature}
              className="border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground rounded-full border px-4 py-2 text-sm transition-colors"
            >
              {feature}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-muted-foreground border-t py-6 text-center text-sm">
        <p>© {new Date().getFullYear()} LifeLedger. All rights reserved.</p>
      </footer>
    </div>
  );
}

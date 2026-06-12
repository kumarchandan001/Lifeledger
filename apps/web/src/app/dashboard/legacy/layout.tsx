'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Overview', href: '/dashboard/legacy', icon: '🏛️' },
  { label: 'Beneficiaries', href: '/dashboard/legacy/beneficiaries', icon: '👥' },
  { label: 'Plans', href: '/dashboard/legacy/plans', icon: '📋' },
  { label: 'Legacy Vault', href: '/dashboard/legacy/vault', icon: '🔐' },
  { label: 'Instructions', href: '/dashboard/legacy/instructions', icon: '📝' },
  { label: 'Messages', href: '/dashboard/legacy/messages', icon: '💌' },
  { label: 'Digital Assets', href: '/dashboard/legacy/assets', icon: '🏦' },
  { label: 'Access Requests', href: '/dashboard/legacy/requests', icon: '🔑' },
  { label: 'Readiness', href: '/dashboard/legacy/readiness', icon: '📊' },
  { label: 'Activity', href: '/dashboard/legacy/activity', icon: '📜' },
];

export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="border-border bg-card rounded-lg border-b p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Digital Legacy Planning</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Prepare, organize, and securely pass on your important information and digital
              assets to trusted beneficiaries.
            </p>
          </div>
        </div>
        <nav className="mt-6 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const isActive =
              tab.href === '/dashboard/legacy'
                ? pathname === '/dashboard/legacy'
                : pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground scale-[1.02] shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">{children}</div>
    </div>
  );
}

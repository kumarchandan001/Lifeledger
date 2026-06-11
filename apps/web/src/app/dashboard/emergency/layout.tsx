'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Overview', href: '/dashboard/emergency', icon: '🚨' },
  { label: 'Trusted Contacts', href: '/dashboard/emergency/contacts', icon: '👤' },
  { label: 'Emergency Vault', href: '/dashboard/emergency/vault', icon: '🔒' },
  { label: 'Access Requests', href: '/dashboard/emergency/requests', icon: '📨' },
  { label: 'Activity History', href: '/dashboard/emergency/history', icon: '📜' },
  { label: 'Settings', href: '/dashboard/emergency/settings', icon: '⚙️' },
];

export default function EmergencyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="border-border bg-card rounded-lg border-b p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Emergency Access Platform</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Securely designate trusted contacts who can request controlled access to your vault in
              case of emergency.
            </p>
          </div>
        </div>
        <nav className="mt-6 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
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

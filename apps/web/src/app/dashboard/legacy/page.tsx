'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Users, FileText, ScrollText, Mail, Building2, Key, ArrowRight, ShieldCheck } from 'lucide-react';

interface DashboardStats {
  beneficiaryCount: number;
  planCount: number;
  vaultDocumentCount: number;
  instructionCount: number;
  messageCount: number;
  assetCount: number;
  pendingRequests: number;
  readinessScore: number;
}

export default function LegacyDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    beneficiaryCount: 0,
    planCount: 0,
    vaultDocumentCount: 0,
    instructionCount: 0,
    messageCount: 0,
    assetCount: 0,
    pendingRequests: 0,
    readinessScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await api.get('/legacy/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch legacy stats', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground animate-pulse">Loading legacy dashboard...</div>
      </div>
    );
  }

  const cards = [
    {
      label: 'Beneficiaries',
      value: stats.beneficiaryCount,
      icon: Users,
      color: 'blue',
      href: '/dashboard/legacy/beneficiaries',
    },
    {
      label: 'Legacy Plans',
      value: stats.planCount,
      icon: FileText,
      color: 'purple',
      href: '/dashboard/legacy/plans',
    },
    {
      label: 'Vault Documents',
      value: stats.vaultDocumentCount,
      icon: ShieldCheck,
      color: 'emerald',
      href: '/dashboard/legacy/vault',
    },
    {
      label: 'Instructions',
      value: stats.instructionCount,
      icon: ScrollText,
      color: 'amber',
      href: '/dashboard/legacy/instructions',
    },
    {
      label: 'Messages',
      value: stats.messageCount,
      icon: Mail,
      color: 'pink',
      href: '/dashboard/legacy/messages',
    },
    {
      label: 'Digital Assets',
      value: stats.assetCount,
      icon: Building2,
      color: 'cyan',
      href: '/dashboard/legacy/assets',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    amber: 'bg-amber-500/10 text-amber-500',
    pink: 'bg-pink-500/10 text-pink-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
  };

  return (
    <div className="space-y-6">
      {/* Readiness Score Banner */}
      <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-semibold">Legacy Readiness Score</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              How prepared is your digital legacy for your beneficiaries.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20">
              <svg className="h-20 w-20 -rotate-90 transform" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  strokeWidth="6"
                  fill="none"
                  className="stroke-muted"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(stats.readinessScore / 100) * 226.2} 226.2`}
                  className={`transition-all duration-1000 ${
                    stats.readinessScore >= 70
                      ? 'stroke-emerald-500'
                      : stats.readinessScore >= 40
                        ? 'stroke-amber-500'
                        : 'stroke-red-500'
                  }`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                {stats.readinessScore}%
              </span>
            </div>
            <Link
              href="/dashboard/legacy/readiness"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              View Details
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-card border-border group flex items-center space-x-4 rounded-xl border p-6 transition-all hover:shadow-md"
          >
            <div className={`rounded-lg p-3 ${colorMap[card.color]}`}>
              <card.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-muted-foreground text-sm font-medium">{card.label}</p>
              <h3 className="mt-1 text-2xl font-bold">{card.value}</h3>
            </div>
            <ArrowRight className="text-muted-foreground h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      {/* Pending Requests Alert */}
      {stats.pendingRequests > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400">
          <div className="flex items-center space-x-3">
            <Key className="h-5 w-5" />
            <div>
              <p className="font-semibold">Pending Access Requests</p>
              <p className="mt-0.5 text-sm font-normal opacity-90">
                You have {stats.pendingRequests} pending legacy access request(s) to review.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/legacy/requests"
            className="flex items-center gap-1 text-sm font-medium underline"
          >
            Review <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Add Beneficiary', href: '/dashboard/legacy/beneficiaries', icon: '👤' },
            { label: 'Create Plan', href: '/dashboard/legacy/plans', icon: '📋' },
            { label: 'Add to Vault', href: '/dashboard/legacy/vault', icon: '🔐' },
            { label: 'Write Instruction', href: '/dashboard/legacy/instructions', icon: '📝' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="bg-muted/50 hover:bg-muted flex items-center gap-3 rounded-lg p-4 transition-colors"
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

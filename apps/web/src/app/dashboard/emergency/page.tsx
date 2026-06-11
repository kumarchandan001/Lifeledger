'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Shield, Users, Lock, Clock, Activity, ArrowRight } from 'lucide-react';

export default function EmergencyHubPage() {
  const [stats, setStats] = useState({
    contactsCount: 0,
    vaultCount: 0,
    pendingRequests: 0,
    waitingPeriod: 7,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [contactsRes, vaultRes, requestsRes, userRes] = await Promise.all([
          api.get('/emergency/contacts'),
          api.get('/emergency/vault/documents'),
          api.get('/emergency/requests'),
          api.get('/auth/me').catch(() => null),
        ]);

        const profile = userRes?.data?.data || userRes?.data || {};

        setStats({
          contactsCount: contactsRes.data?.length ?? 0,
          vaultCount: vaultRes.data?.length ?? 0,
          pendingRequests: requestsRes.data?.filter((r: any) => r.status === 'PENDING').length ?? 0,
          waitingPeriod: profile.emergencyWaitingPeriod ?? 7,
        });
      } catch (err) {
        console.error('Failed to fetch emergency stats', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground animate-pulse">Loading emergency hub...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="bg-card border-border flex items-center space-x-4 rounded-xl border p-6 transition-shadow hover:shadow-md">
          <div className="rounded-lg bg-blue-500/10 p-3 text-blue-500">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">Trusted Contacts</p>
            <h3 className="mt-1 text-2xl font-bold">{stats.contactsCount}</h3>
          </div>
        </div>

        <div className="bg-card border-border flex items-center space-x-4 rounded-xl border p-6 transition-shadow hover:shadow-md">
          <div className="rounded-lg bg-purple-500/10 p-3 text-purple-500">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">Vault Items</p>
            <h3 className="mt-1 text-2xl font-bold">{stats.vaultCount}</h3>
          </div>
        </div>

        <div className="bg-card border-border flex items-center space-x-4 rounded-xl border p-6 transition-shadow hover:shadow-md">
          <div
            className={`rounded-lg p-3 ${stats.pendingRequests > 0 ? 'animate-pulse bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}
          >
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-medium">Pending Requests</p>
            <h3 className="mt-1 text-2xl font-bold">{stats.pendingRequests}</h3>
          </div>
        </div>
      </div>

      {stats.pendingRequests > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-700 dark:text-red-400">
          <div className="flex items-center space-x-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold">Pending Emergency Requests</p>
              <p className="mt-0.5 text-sm font-normal opacity-90">
                You have incoming requests that need your review.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/emergency/requests"
            className="flex items-center space-x-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            <span>Review Now</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Info Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-card border-border space-y-4 rounded-xl border p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Shield className="text-primary h-5 w-5" /> How Emergency Access Works
          </h3>
          <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">
            <p>
              <strong className="text-foreground">1. Designate Contacts:</strong> Add trusted
              individuals (e.g., spouse, lawyer, friend) and define their relationship.
            </p>
            <p>
              <strong className="text-foreground">2. Add to Vault:</strong> Select critical
              documents (medical summaries, insurance policies, legal records) for your Emergency
              Vault. Nobody has access to them yet.
            </p>
            <p>
              <strong className="text-foreground">3. Request & Waiting Period:</strong> In an
              emergency, a contact requests access. This triggers immediate email/in-app alerts and
              starts a{' '}
              <strong className="text-foreground">{stats.waitingPeriod}-day waiting period</strong>.
            </p>
            <p>
              <strong className="text-foreground">4. Response & Session:</strong> If you approve,
              they get immediate read-only access. If you reject, access is blocked. If you don't
              respond, the request escalates for review.
            </p>
          </div>
        </div>

        <div className="bg-card border-border flex flex-col justify-between rounded-xl border p-6 shadow-sm">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Activity className="text-primary h-5 w-5" /> Quick Operations
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Configure your emergency settings and build your vault so that in an critical
              scenario, your loved ones can seamlessly access necessary info under secure audit
              logs.
            </p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Link
              href="/dashboard/emergency/contacts"
              className="border-border bg-muted/50 hover:bg-muted text-foreground flex items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-all"
            >
              Add Contacts
            </Link>
            <Link
              href="/dashboard/emergency/vault"
              className="border-border bg-muted/50 hover:bg-muted text-foreground flex items-center justify-center rounded-lg border p-3 text-center text-sm font-medium transition-all"
            >
              Configure Vault
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card hover:shadow-md transition-shadow p-6 rounded-xl border border-border flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Trusted Contacts</p>
            <h3 className="text-2xl font-bold mt-1">{stats.contactsCount}</h3>
          </div>
        </div>

        <div className="bg-card hover:shadow-md transition-shadow p-6 rounded-xl border border-border flex items-center space-x-4">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Vault Items</p>
            <h3 className="text-2xl font-bold mt-1">{stats.vaultCount}</h3>
          </div>
        </div>

        <div className="bg-card hover:shadow-md transition-shadow p-6 rounded-xl border border-border flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${stats.pendingRequests > 0 ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-green-500/10 text-green-500'}`}>
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Pending Requests</p>
            <h3 className="text-2xl font-bold mt-1">{stats.pendingRequests}</h3>
          </div>
        </div>
      </div>

      {stats.pendingRequests > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold">Pending Emergency Requests</p>
              <p className="text-sm opacity-90 font-normal mt-0.5">You have incoming requests that need your review.</p>
            </div>
          </div>
          <Link
            href="/dashboard/emergency/requests"
            className="flex items-center space-x-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <span>Review Now</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Info Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Shield className="text-primary h-5 w-5" /> How Emergency Access Works
          </h3>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">1. Designate Contacts:</strong> Add trusted individuals (e.g., spouse, lawyer, friend) and define their relationship.
            </p>
            <p>
              <strong className="text-foreground">2. Add to Vault:</strong> Select critical documents (medical summaries, insurance policies, legal records) for your Emergency Vault. Nobody has access to them yet.
            </p>
            <p>
              <strong className="text-foreground">3. Request & Waiting Period:</strong> In an emergency, a contact requests access. This triggers immediate email/in-app alerts and starts a <strong className="text-foreground">{stats.waitingPeriod}-day waiting period</strong>.
            </p>
            <p>
              <strong className="text-foreground">4. Response & Session:</strong> If you approve, they get immediate read-only access. If you reject, access is blocked. If you don't respond, the request escalates for review.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Activity className="text-primary h-5 w-5" /> Quick Operations
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Configure your emergency settings and build your vault so that in an critical scenario, your loved ones can seamlessly access necessary info under secure audit logs.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Link
              href="/dashboard/emergency/contacts"
              className="flex items-center justify-center p-3 text-sm font-medium border border-border rounded-lg bg-muted/50 hover:bg-muted text-foreground transition-all text-center"
            >
              Add Contacts
            </Link>
            <Link
              href="/dashboard/emergency/vault"
              className="flex items-center justify-center p-3 text-sm font-medium border border-border rounded-lg bg-muted/50 hover:bg-muted text-foreground transition-all text-center"
            >
              Configure Vault
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

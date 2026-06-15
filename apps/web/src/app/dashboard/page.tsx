'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { 
  Shield, 
  Sparkles, 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Award, 
  ArrowRight,
  ChevronRight,
  Calendar,
  Lock,
  Plus,
  RefreshCw,
  XCircle,
  Heart
} from 'lucide-react';
import type { ExpiringDocument, NotificationSummary } from '@lifeledger/shared';

interface ExpiredDocument {
  id: string;
  title: string;
  categoryName: string;
  categoryIcon: string;
  expiryDate: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [expiringSoon, setExpiringSoon] = useState<ExpiringDocument[]>([]);
  const [recentlyExpired, setRecentlyExpired] = useState<ExpiredDocument[]>([]);
  const [summary, setSummary] = useState<NotificationSummary>({
    totalNotifications: 0,
    unreadNotifications: 0,
    expiringThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  // Onboarding missions checklist - using local interactive state for Duolingo-like psychology
  const [missions, setMissions] = useState({
    aadhaar: true,
    pan: true,
    family: false,
    emergency: true,
    legacy: false,
  });

  // Dynamic Time-based Greeting
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [expiringRes, expiredRes, summaryRes] = await Promise.all([
          api.get('/expiry/expiring-soon'),
          api.get('/expiry/recently-expired'),
          api.get('/expiry/summary'),
        ]);

        setExpiringSoon(expiringRes.data ?? []);
        setRecentlyExpired(expiredRes.data ?? []);
        setSummary(
          summaryRes.data ?? {
            totalNotifications: 0,
            unreadNotifications: 0,
            expiringThisMonth: 0,
          },
        );
      } catch {
        // silently ignore dashboard data fetch errors
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Calculate mission completion percentage
  const calculateMissionProgress = () => {
    let completedWeight = 0;
    if (missions.aadhaar) completedWeight += 30;
    if (missions.pan) completedWeight += 30;
    if (missions.family) completedWeight += 15;
    if (missions.emergency) completedWeight += 15;
    if (missions.legacy) completedWeight += 10;
    return completedWeight;
  };

  // Calculate Life Score
  // Base is 18, each item adds weight to reach 100 when all are completed
  const calculateLifeScore = () => {
    let score = 18;
    if (missions.aadhaar) score += 25;
    if (missions.pan) score += 25;
    if (missions.family) score += 12;
    if (missions.emergency) score += 10;
    if (missions.legacy) score += 10;
    return score;
  };

  const toggleMission = (key: keyof typeof missions) => {
    setMissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getDaysLabel = (days: number) => {
    if (days <= 0) return 'Expired';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  const getDaysBadgeClass = (days: number) => {
    if (days <= 7) return 'badge-urgent';
    if (days <= 30) return 'badge-warning';
    return 'badge-notice';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const score = calculateLifeScore();
  const progress = calculateMissionProgress();

  // Attention actions (we let user remove them dynamically to simulate "View", "Renew" or "Remind Later")
  const [attentionItems, setAttentionItems] = useState([
    { id: '1', title: 'Passport', expiry: 'expires in 60 days', icon: '🛂', type: 'passport' },
    { id: '2', title: 'Health Insurance', expiry: 'expires in 20 days', icon: '🏥', type: 'insurance' },
    { id: '3', title: 'Driver\'s License', expiry: 'expires in 90 days', icon: '🪪', type: 'license' },
  ]);

  const handleRemoveAttention = (id: string) => {
    setAttentionItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Family status list helper
  const familyMembers = [
    { name: 'Father', relationship: 'Father', status: 'Protected', icon: '👨', color: 'indigo' },
    { name: 'Mother', relationship: 'Mother', status: 'Protected', icon: '👩', color: 'emerald' },
    { name: 'Brother', relationship: 'Brother', status: 'Needs Attention', detail: 'Missing PAN', icon: '👦', color: 'amber' },
    { name: 'Sister', relationship: 'Sister', status: 'Protected', icon: '👧', color: 'purple' },
  ];

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-20"></span>
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500">Loading your Life Command Center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ─── Hero Section ─── */}
      <section className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {greeting}, {user?.fullName?.split(' ')[0] || 'User'} 👋
          </h2>
          <p className="mt-1.5 text-base text-slate-500">
            Your digital life is <span className="font-semibold text-indigo-600">{score}% organized</span>. You have <span className="font-semibold text-amber-600">{attentionItems.length} important actions</span> today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setMissions({ aadhaar: true, pan: true, family: true, emergency: true, legacy: true });
              setAttentionItems([]);
            }} 
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Quick Auto-Complete
          </button>
          <button 
            onClick={() => {
              setMissions({ aadhaar: true, pan: true, family: false, emergency: false, legacy: false });
              setAttentionItems([
                { id: '1', title: 'Passport', expiry: 'expires in 60 days', icon: '🛂', type: 'passport' },
                { id: '2', title: 'Health Insurance', expiry: 'expires in 20 days', icon: '🏥', type: 'insurance' },
                { id: '3', title: 'Driver\'s License', expiry: 'expires in 90 days', icon: '🪪', type: 'license' },
              ]);
            }} 
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 transition-all hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </section>

      {/* ─── Primary Score & Protection Status Grid ─── */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* LifeLedger Score Circular Progress */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Life Score Status</span>
                <h3 className="text-2xl font-bold text-slate-800">Life Ledger Score</h3>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  <span>Documents Uploaded ({missions.aadhaar && missions.pan ? 'Excellent' : 'Needs Work'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                  <span>Family protection ({missions.family ? 'Fully Connected' : 'Unfinished'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                  <span>Emergency Vault ({missions.emergency ? 'Configured' : 'Inactive'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-500"></span>
                  <span>Legacy Readiness ({missions.legacy ? 'Ready' : 'Pending'})</span>
                </div>
              </div>
              {/* Progress Milestones Bar */}
              <div className="w-full space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>25% Secured</span>
                  <span>50% Managed</span>
                  <span>75% Prepared</span>
                  <span>100% Shielded</span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-700 ease-out"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="relative flex flex-col items-center justify-center p-2">
              {/* Circular SVG Ring */}
              <svg className="h-44 w-44 -rotate-90">
                <circle
                  cx="88"
                  cy="88"
                  r="74"
                  className="stroke-slate-100"
                  strokeWidth="12"
                  fill="transparent"
                />
                <circle
                  cx="88"
                  cy="88"
                  r="74"
                  className="stroke-indigo-600 transition-all duration-700 ease-out"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={465}
                  strokeDashoffset={465 - (465 * score) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">{score}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Life Protection Status Checklist Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-slate-800">
              <Shield className="h-5 w-5 text-indigo-600" />
              Protection Status
            </h3>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${score >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {score >= 90 ? 'Secure' : score >= 60 ? 'Optimal' : 'vulnerable'}
            </span>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between rounded-xl bg-slate-50/50 p-3 transition-colors hover:bg-slate-50">
              <span className="text-sm font-semibold text-slate-700">Documents Protected</span>
              <span className={`h-2.5 w-2.5 rounded-full ${missions.aadhaar && missions.pan ? 'bg-emerald-500 shadow-emerald-200' : 'bg-amber-400 shadow-amber-100'} shadow-md`}></span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50/50 p-3 transition-colors hover:bg-slate-50">
              <span className="text-sm font-semibold text-slate-700">Family Protected</span>
              <span className={`h-2.5 w-2.5 rounded-full ${missions.family ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-300'} shadow-md`}></span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50/50 p-3 transition-colors hover:bg-slate-50">
              <span className="text-sm font-semibold text-slate-700">Emergency Ready</span>
              <span className={`h-2.5 w-2.5 rounded-full ${missions.emergency ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-300'} shadow-md`}></span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50/50 p-3 transition-colors hover:bg-slate-50">
              <span className="text-sm font-semibold text-slate-700">Legacy Ready</span>
              <span className={`h-2.5 w-2.5 rounded-full ${missions.legacy ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-300'} shadow-md`}></span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Mission System & Proactive AI Coach ─── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Mission System Onboarding Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-800">Complete Your Life Setup</h3>
            <p className="text-sm text-slate-500">Take steps to protect your legacy and shield your assets.</p>
          </div>

          <div className="mb-5 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Onboarding Progress</span>
            <span className="text-sm font-bold text-slate-700">{progress}%</span>
          </div>

          <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div 
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="space-y-3">
            {[
              { key: 'aadhaar', label: 'Upload Aadhaar Card', type: 'Identity' },
              { key: 'pan', label: 'Upload PAN Card', type: 'Financial' },
              { key: 'family', label: 'Add Family Member', type: 'Protection' },
              { key: 'emergency', label: 'Enable Emergency Access', type: 'Emergency' },
              { key: 'legacy', label: 'Create Legacy Plan', type: 'Legacy' },
            ].map((mission) => {
              const isChecked = missions[mission.key as keyof typeof missions];
              return (
                <div 
                  key={mission.key} 
                  onClick={() => toggleMission(mission.key as keyof typeof missions)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all hover:border-indigo-200 hover:bg-slate-50/20 ${
                    isChecked ? 'border-slate-100 bg-slate-50/40 text-slate-500' : 'border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent onClick
                      className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className={`text-sm font-semibold ${isChecked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {mission.label}
                    </span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    isChecked ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    {mission.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Life Coach Widget */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-b from-indigo-950 to-slate-900 p-6 text-white shadow-sm transition-all hover:shadow-md">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                AI Intelligence Coach
              </h3>
              <span className="rounded-full bg-indigo-900/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                Proactive
              </span>
            </div>

            <div className="space-y-4">
              {/* Alert 1 */}
              <div className="flex gap-3 rounded-xl bg-white/5 p-3.5 border border-white/5 transition-all hover:bg-white/10">
                <Clock className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-white/90">Insurance Policy Expiry</p>
                  <p className="mt-1 text-slate-300">Your health insurance expires in 42 days. We recommend initiating renewal next month.</p>
                  <button className="mt-2 font-bold text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1">
                    Start Renewal <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Alert 2 */}
              <div className="flex gap-3 rounded-xl bg-white/5 p-3.5 border border-white/5 transition-all hover:bg-white/10">
                <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-white/90">Beneficiary Assignment Missing</p>
                  <p className="mt-1 text-slate-300">You have uploaded insurance documents but not assigned a beneficiary to them.</p>
                  <button className="mt-2 font-bold text-rose-400 hover:text-rose-300 transition-colors inline-flex items-center gap-1">
                    Assign Now <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Alert 3 */}
              <div className="flex gap-3 rounded-xl bg-white/5 p-3.5 border border-white/5 transition-all hover:bg-white/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-white/90">Legacy Readiness Boost</p>
                  <p className="mt-1 text-slate-300">Your legacy readiness score increased by 12% following your recent document updates.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Have questions about your score?</span>
            <button className="rounded-lg bg-indigo-600 px-3.5 py-1.5 font-bold text-white hover:bg-indigo-500 transition-all hover:shadow-lg hover:shadow-indigo-500/20">
              Ask AI Coach
            </button>
          </div>
        </div>
      </div>

      {/* ─── Family Protection Widget & Legacy Readiness Widget ─── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Family Protection Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="h-5 w-5 text-indigo-600" />
                Family Protected
              </h3>
              <p className="text-sm text-slate-500">4 active family members linked to your vault.</p>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm">
              4
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {familyMembers.map((member) => (
              <div key={member.name} className="flex items-center gap-3.5 rounded-xl border border-slate-100 p-3.5 transition-all hover:bg-slate-50/50">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg bg-${member.color}-50 border border-${member.color}-100`}>
                  {member.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{member.name}</p>
                  <p className="text-xs text-slate-400">{member.relationship}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                  member.status === 'Protected' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700 animate-pulse'
                }`}>
                  {member.status === 'Protected' ? 'Protected' : member.detail || 'Needs Work'}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 text-center">
            <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors inline-flex items-center gap-1">
              Manage Family Hub <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Legacy Readiness Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                <Heart className="h-5 w-5 text-rose-500" />
                Legacy Readiness
              </h3>
              <p className="text-sm text-slate-500">Plan and secure your assets for the next generation.</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-slate-800">72%</span>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Complete</span>
            </div>
          </div>

          {/* Missing items checklist */}
          <div className="space-y-3">
            <div className="rounded-xl border border-rose-100 bg-rose-50/20 p-3 flex items-start gap-3">
              <Lock className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-rose-800">Emergency Vault Blocked</span>
                <p className="mt-0.5 text-rose-600">Assign a secondary trustee to trigger access when required.</p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50/20 p-3 flex items-start gap-3">
              <FileText className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-amber-800">No Beneficiary Setup</span>
                <p className="mt-0.5 text-amber-600">Ensure at least one beneficiary is linked to your digital legacy plans.</p>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-3 flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-indigo-800">Missing Personal Message</span>
                <p className="mt-0.5 text-indigo-600">Add a personal voice note, message, or instruction for your loved ones.</p>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">3 recommended steps left</span>
            <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors inline-flex items-center gap-1">
              Complete Legacy Setup <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Attention Center & Activity Timeline Grid ─── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Attention Center */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-800">Needs Your Attention</h3>
            <p className="text-sm text-slate-500">Take action on documents expiring soon.</p>
          </div>

          {attentionItems.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center text-center p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 text-xl mb-3">
                🎉
              </div>
              <p className="text-sm font-semibold text-slate-800">You're all caught up!</p>
              <p className="text-xs text-slate-500 mt-0.5">Your documents are fully protected and up to date.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attentionItems.map((item) => (
                <div key={item.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl h-10 w-10 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-100">
                      {item.icon}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
                      <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-semibold mt-0.5">
                        <Clock className="h-3 w-3" />
                        {item.expiry}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t border-slate-50 pt-2 sm:border-t-0 sm:pt-0">
                    <button 
                      onClick={() => alert(`Viewing document: ${item.title}`)}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => handleRemoveAttention(item.id)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-500"
                    >
                      Renew
                    </button>
                    <button 
                      onClick={() => handleRemoveAttention(item.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50"
                    >
                      Remind Later
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Timeline & Achievements */}
        <div className="space-y-6">
          {/* Achievements Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <h3 className="mb-4 text-base font-bold text-slate-800 flex items-center gap-1.5">
              <Award className="h-5 w-5 text-amber-500" />
              Earned Badges
            </h3>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: 'First Protected', icon: '🔒', title: 'First Document Protected', desc: 'Securely protected first record', active: missions.aadhaar || missions.pan },
                { label: 'Family Guard', icon: '🛡️', title: 'Family Protector', desc: 'Added 4 family members', active: missions.family },
                { label: 'Emergency Ready', icon: '🚨', title: 'Emergency Ready', desc: 'Configured secondary trustee access', active: missions.emergency },
                { label: 'Legacy Planner', icon: '🕊️', title: 'Legacy Planner', desc: 'Created digital asset plan', active: missions.legacy },
                { label: 'Life Organized', icon: '✨', title: 'Life Organized', desc: 'Achieved Life Score 100', active: score === 100 },
              ].map((badge) => (
                <div 
                  key={badge.label} 
                  title={`${badge.title}: ${badge.desc}`}
                  className={`group relative flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition-all ${
                    badge.active 
                      ? 'border-indigo-100 bg-indigo-50/10 hover:border-indigo-200' 
                      : 'border-slate-100 bg-slate-50/20 opacity-50 grayscale'
                  }`}
                >
                  <span className={`text-2xl mb-1.5 transition-transform group-hover:scale-110 ${badge.active ? 'animate-bounce' : ''}`}>
                    {badge.icon}
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 leading-tight">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Timeline Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <h3 className="mb-4 text-base font-bold text-slate-800">Activity Timeline</h3>

            <div className="relative border-l border-slate-100 pl-4.5 space-y-5">
              {/* Event 1 */}
              <div className="relative">
                <span className="absolute -left-[27px] top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-50 border-2 border-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                </span>
                <div className="text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wide">Today</span>
                  <p className="mt-1 font-semibold text-slate-800">Passport Document Uploaded</p>
                  <p className="text-slate-500 mt-0.5">Scanned and indexed with OCR intelligence.</p>
                </div>
              </div>

              {/* Event 2 */}
              <div className="relative">
                <span className="absolute -left-[27px] top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-50 border-2 border-indigo-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                </span>
                <div className="text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wide">Yesterday</span>
                  <p className="mt-1 font-semibold text-slate-800">Family Member Added</p>
                  <p className="text-slate-500 mt-0.5">Brother added to vault with custom metadata.</p>
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative">
                <span className="absolute -left-[27px] top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-purple-50 border-2 border-purple-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                </span>
                <div className="text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wide">Last Week</span>
                  <p className="mt-1 font-semibold text-slate-800">Emergency Access Enabled</p>
                  <p className="text-slate-500 mt-0.5">Assigned trusted trustee and waiting terms.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Quick Action Drawer / Mobile Bar */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95">
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

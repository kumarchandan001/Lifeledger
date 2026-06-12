'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { RefreshCw, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';

interface ReadinessReport {
  score: number;
  maxScore: number;
  breakdown: Record<string, number>;
  suggestions: Array<{ category: string; title: string; description: string; priority: string }>;
  missingItems: Array<{ category: string; itemType: string; reason: string }>;
  generatedAt: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: 'border-l-red-500 bg-red-500/5',
  MEDIUM: 'border-l-amber-500 bg-amber-500/5',
  LOW: 'border-l-blue-500 bg-blue-500/5',
};

const BREAKDOWN_LABELS: Record<string, { label: string; icon: string; max: number }> = {
  beneficiaries: { label: 'Beneficiaries', icon: '👥', max: 20 },
  plans: { label: 'Legacy Plans', icon: '📋', max: 15 },
  vault: { label: 'Vault Documents', icon: '🔐', max: 25 },
  instructions: { label: 'Instructions', icon: '📝', max: 15 },
  messages: { label: 'Messages', icon: '💌', max: 10 },
  assets: { label: 'Digital Assets', icon: '🏦', max: 15 },
};

export default function ReadinessPage() {
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await api.get('/legacy/readiness');
      setReport(res.data);
    } catch (err) {
      console.error('Failed to generate readiness report', err);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="text-muted-foreground animate-pulse">Analyzing your legacy readiness...</div></div>;

  if (!report) return <div className="p-12 text-center text-red-500">Failed to generate readiness report.</div>;

  const scoreColor = report.score >= 70 ? 'text-emerald-500' : report.score >= 40 ? 'text-amber-500' : 'text-red-500';
  const strokeColor = report.score >= 70 ? 'stroke-emerald-500' : report.score >= 40 ? 'stroke-amber-500' : 'stroke-red-500';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Legacy Readiness Score</h3>
          <p className="text-muted-foreground text-sm">AI-powered assessment of how prepared your digital legacy is.</p>
        </div>
        <button onClick={generateReport} disabled={generating} className="bg-muted hover:bg-muted/80 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} /> Regenerate
        </button>
      </div>

      {/* Score Circle */}
      <div className="bg-card border-border rounded-xl border p-8 text-center shadow-sm">
        <div className="relative mx-auto h-40 w-40">
          <svg className="h-40 w-40 -rotate-90 transform" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="72" strokeWidth="10" fill="none" className="stroke-muted" />
            <circle cx="80" cy="80" r="72" strokeWidth="10" fill="none" strokeLinecap="round"
              strokeDasharray={`${(report.score / 100) * 452.4} 452.4`}
              className={`transition-all duration-1000 ${strokeColor}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${scoreColor}`}>{report.score}</span>
            <span className="text-muted-foreground text-sm">/ {report.maxScore}</span>
          </div>
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          {report.score >= 70 ? '✅ Your legacy is well-organized!' :
           report.score >= 40 ? '⚠️ Good progress, but there are gaps to fill.' :
           '🔴 Your legacy needs attention. Follow the suggestions below.'}
        </p>
      </div>

      {/* Breakdown */}
      <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
        <h4 className="mb-4 text-lg font-semibold">Score Breakdown</h4>
        <div className="space-y-3">
          {Object.entries(BREAKDOWN_LABELS).map(([key, meta]) => {
            const value = report.breakdown[key] || 0;
            const pct = Math.min(100, (value / meta.max) * 100);
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">{meta.icon} {meta.label}</span>
                  <span className="text-muted-foreground font-medium">{value}/{meta.max}</span>
                </div>
                <div className="bg-muted mt-1 h-2 overflow-hidden rounded-full">
                  <div className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggestions */}
      {report.suggestions.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-lg font-semibold"><Lightbulb className="h-5 w-5 text-amber-500" /> Suggestions</h4>
          {report.suggestions.map((s, i) => (
            <div key={i} className={`rounded-xl border-l-4 p-4 ${PRIORITY_STYLES[s.priority] || PRIORITY_STYLES.LOW}`}>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.priority === 'HIGH' ? 'bg-red-500/10 text-red-600' : s.priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}>{s.priority}</span>
                <h5 className="font-semibold">{s.title}</h5>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{s.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Missing Items */}
      {report.missingItems.length > 0 && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="h-5 w-5 text-red-500" /> Missing Items</h4>
          {report.missingItems.map((m, i) => (
            <div key={i} className="bg-card border-border flex items-start gap-3 rounded-xl border p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-gray-300" />
              <div>
                <h5 className="font-medium">{m.itemType}</h5>
                <p className="text-muted-foreground text-sm">{m.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

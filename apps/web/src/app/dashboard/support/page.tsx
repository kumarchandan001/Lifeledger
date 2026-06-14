'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { toast } from 'sonner';

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<'ticket' | 'gdpr'>('ticket');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'SUPPORT' | 'BUG_REPORT' | 'FEEDBACK'>('SUPPORT');
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) {
      toast.error('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/support', { name, email, subject, message, category });
      toast.success('Your support request has been submitted successfully.');
      analytics.track('support_ticket_created', { category });
      setSubject('');
      setMessage('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit support request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await api.get('/users/gdpr/export');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `lifeledger_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Your data has been exported successfully.');
      analytics.track('gdpr_data_exported');
    } catch (err: any) {
      toast.error('Failed to export your data.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE PERMANENTLY') {
      toast.error('Please type DELETE PERMANENTLY to confirm.');
      return;
    }

    setDeleting(true);
    try {
      await api.delete('/users/gdpr/delete');
      toast.success('Your account has been deleted permanently.');
      analytics.track('gdpr_account_deleted');
      localStorage.removeItem('lifeledger_access_token');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err: any) {
      toast.error('Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="billing-section" style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #2d3748', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('ticket')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'ticket' ? '2px solid #6366f1' : 'none',
            color: activeTab === 'ticket' ? '#6366f1' : '#a0aec0',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          💬 Contact Support / Feedback
        </button>
        <button
          onClick={() => setActiveTab('gdpr')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'gdpr' ? '2px solid #6366f1' : 'none',
            color: activeTab === 'gdpr' ? '#6366f1' : '#a0aec0',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🔒 GDPR Privacy Tools
        </button>
      </div>

      {activeTab === 'ticket' ? (
        <div style={{ background: '#1a202c', padding: '2rem', borderRadius: '12px', border: '1px solid #2d3748' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#fff' }}>Open a Ticket</h2>
          <form onSubmit={handleSubmitTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', color: '#a0aec0', marginBottom: '0.5rem', display: 'block' }}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: '#2d3748',
                    border: '1px solid #4a5568',
                    color: '#fff',
                  }}
                  placeholder="Your full name"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', color: '#a0aec0', marginBottom: '0.5rem', display: 'block' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: '#2d3748',
                    border: '1px solid #4a5568',
                    color: '#fff',
                  }}
                  placeholder="Your contact email"
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: '#a0aec0', marginBottom: '0.5rem', display: 'block' }}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: '#2d3748',
                  border: '1px solid #4a5568',
                  color: '#fff',
                }}
              >
                <option value="SUPPORT">General Support</option>
                <option value="BUG_REPORT">Bug Report</option>
                <option value="FEEDBACK">Feedback & Suggestion</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: '#a0aec0', marginBottom: '0.5rem', display: 'block' }}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: '#2d3748',
                  border: '1px solid #4a5568',
                  color: '#fff',
                }}
                placeholder="Brief summary of your query"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: '#a0aec0', marginBottom: '0.5rem', display: 'block' }}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: '#2d3748',
                  border: '1px solid #4a5568',
                  color: '#fff',
                  resize: 'vertical',
                }}
                placeholder="Detail your issue or feedback..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Submitting...' : 'Send Request'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Data Export */}
          <div style={{ background: '#1a202c', padding: '2rem', borderRadius: '12px', border: '1px solid #2d3748' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.5rem' }}>📥 Export Personal Data</h3>
            <p style={{ color: '#a0aec0', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Under the GDPR, you have the right to request access to and export all data that is stored inside LifeLedger.
              Clicking the button below will compile and download your entire platform footprint (profile details, document listings, metadata, audit trails, and preferences) as a JSON archive.
            </p>
            <button
              onClick={handleExportData}
              disabled={exporting}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                background: '#2d3748',
                color: '#fff',
                border: '1px solid #4a5568',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: exporting ? 0.7 : 1,
              }}
            >
              {exporting ? 'Compiling JSON...' : 'Request Data Export'}
            </button>
          </div>

          {/* Account Deletion */}
          <div style={{ background: '#1a202c', padding: '2rem', borderRadius: '12px', border: '1px solid #f5656533' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#feb2b2', marginBottom: '0.5rem' }}>🚨 Permanent Account Erasure (Right to be Forgotten)</h3>
            <p style={{ color: '#a0aec0', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Warning: This action is irreversible. Requesting account erasure will physically purge all uploaded documents from secure storage buckets, delete all associated OCR extractions, clear billing records, and permanently remove your user credentials.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
              <label style={{ fontSize: '0.85rem', color: '#feb2b2' }}>Type <strong>DELETE PERMANENTLY</strong> to confirm:</label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: '#2d3748',
                  border: '1px solid #feb2b2',
                  color: '#fff',
                }}
                placeholder="Type the confirmation phrase"
              />
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: '#e53e3e',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting account...' : 'Delete My Account Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

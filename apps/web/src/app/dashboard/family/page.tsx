'use client';

import { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  AlertTriangle, 
  Send, 
  FileText, 
  Mail, 
  User, 
  X, 
  CheckCircle2, 
  Lock,
  Plus,
  Info
} from 'lucide-react';
import './family.css';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  email: string;
  status: 'Protected' | 'Missing Documents' | 'Needs Attention';
  avatar: string;
  color: string;
  documents: { title: string; type: string; status: 'verified' | 'missing' | 'warning' }[];
}

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([
    {
      id: '1',
      name: 'Rajesh Kumar',
      relationship: 'Father',
      email: 'rajesh.kumar@lifeledger.io',
      status: 'Protected',
      avatar: '👨',
      color: 'indigo',
      documents: [
        { title: 'Aadhaar Card', type: 'Identity', status: 'verified' },
        { title: 'PAN Card', type: 'Financial', status: 'verified' },
        { title: 'Health Insurance', type: 'Medical', status: 'verified' },
        { title: 'Will & Testament', type: 'Legal', status: 'verified' },
      ],
    },
    {
      id: '2',
      name: 'Sunita Kumar',
      relationship: 'Mother',
      email: 'sunita.kumar@lifeledger.io',
      status: 'Protected',
      avatar: '👩',
      color: 'emerald',
      documents: [
        { title: 'Aadhaar Card', type: 'Identity', status: 'verified' },
        { title: 'PAN Card', type: 'Financial', status: 'verified' },
        { title: 'Health Insurance', type: 'Medical', status: 'verified' },
      ],
    },
    {
      id: '3',
      name: 'Aravind Kumar',
      relationship: 'Brother',
      email: 'aravind.kumar@lifeledger.io',
      status: 'Needs Attention',
      avatar: '👦',
      color: 'amber',
      documents: [
        { title: 'Aadhaar Card', type: 'Identity', status: 'verified' },
        { title: 'PAN Card', type: 'Financial', status: 'missing' },
        { title: 'Driver\'s License', type: 'Identity', status: 'warning' },
      ],
    },
    {
      id: '4',
      name: 'Priya Kumar',
      relationship: 'Sister',
      email: 'priya.kumar@lifeledger.io',
      status: 'Protected',
      avatar: '👧',
      color: 'purple',
      documents: [
        { title: 'Aadhaar Card', type: 'Identity', status: 'verified' },
        { title: 'PAN Card', type: 'Financial', status: 'verified' },
      ],
    },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    relationship: 'Spouse',
    email: '',
    role: 'Contributor',
  });

  const [requestSentMessage, setRequestSentMessage] = useState<string | null>(null);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.email) return;

    const newId = (members.length + 1).toString();
    const emojis = {
      Spouse: '💑',
      Child: '👶',
      Parent: '👵',
      Sibling: '👱',
      Other: '👤',
    };

    const addedMember: FamilyMember = {
      id: newId,
      name: newMember.name,
      relationship: newMember.relationship,
      email: newMember.email,
      status: 'Missing Documents',
      avatar: emojis[newMember.relationship as keyof typeof emojis] || '👤',
      color: 'pink',
      documents: [
        { title: 'Aadhaar Card', type: 'Identity', status: 'missing' },
        { title: 'PAN Card', type: 'Financial', status: 'missing' },
      ],
    };

    setMembers([...members, addedMember]);
    setNewMember({ name: '', relationship: 'Spouse', email: '', role: 'Contributor' });
    setModalOpen(false);

    setRequestSentMessage(`Invitation successfully sent to ${newMember.name}!`);
    setTimeout(() => setRequestSentMessage(null), 5000);
  };

  const handleRequestDoc = (memberName: string, docTitle: string) => {
    alert(`A notification request was sent to ${memberName} to upload their "${docTitle}".`);
  };

  return (
    <div className="family-container space-y-8">
      {/* ─── Header Section ─── */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Family Protection Hub</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your family's records, invite members, and ensure your loved ones are protected.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 hover:shadow-indigo-500/20 hover:shadow-lg"
        >
          <UserPlus className="h-4.5 w-4.5" />
          Invite Family Member
        </button>
      </section>

      {/* Alert message */}
      {requestSentMessage && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-emerald-800 text-sm font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          {requestSentMessage}
        </div>
      )}

      {/* ─── Summary Cards ─── */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="family-summary-card">
          <div className="card-header">
            <span className="card-tag">Family Protected</span>
            <div className="card-icon bg-indigo-50 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="card-value">{members.length} Members</div>
          <p className="card-subtitle">Connected to your secure vault</p>
        </div>

        <div className="family-summary-card">
          <div className="card-header">
            <span className="card-tag">Status Overall</span>
            <div className="card-icon bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="card-value">
            {members.filter(m => m.status === 'Protected').length} / {members.length}
          </div>
          <p className="card-subtitle">Fully shielded family members</p>
        </div>

        <div className="family-summary-card">
          <div className="card-header">
            <span className="card-tag">Attention Required</span>
            <div className="card-icon bg-amber-50 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="card-value text-amber-600">
            {members.filter(m => m.status !== 'Protected').length} Action
          </div>
          <p className="card-subtitle">Members with missing essential items</p>
        </div>
      </div>

      {/* ─── Members Grid ─── */}
      <div className="grid gap-6 md:grid-cols-2">
        {members.map((member) => (
          <div key={member.id} className="family-member-card">
            {/* Header info */}
            <div className="member-card-header">
              <div className="member-profile">
                <div className={`member-avatar bg-${member.color}-50 border border-${member.color}-100`}>
                  {member.avatar}
                </div>
                <div>
                  <h3 className="member-name">{member.name}</h3>
                  <div className="member-sub-info">
                    <span className="member-rel">{member.relationship}</span>
                    <span className="dot">•</span>
                    <span className="member-email">{member.email}</span>
                  </div>
                </div>
              </div>
              <span className={`member-status-badge ${
                member.status === 'Protected' 
                  ? 'status-protected' 
                  : member.status === 'Needs Attention' 
                    ? 'status-attention' 
                    : 'status-missing'
              }`}>
                {member.status}
              </span>
            </div>

            {/* Document list */}
            <div className="member-docs-container">
              <h4 className="docs-title">Shielded Documents</h4>
              <div className="docs-list">
                {member.documents.map((doc, idx) => (
                  <div key={idx} className="doc-row">
                    <div className="doc-info">
                      <FileText className={`h-4.5 w-4.5 ${
                        doc.status === 'verified' 
                          ? 'text-emerald-500' 
                          : doc.status === 'warning' 
                            ? 'text-amber-500' 
                            : 'text-slate-300'
                      }`} />
                      <div>
                        <span className="doc-title-text">{doc.title}</span>
                        <span className="doc-type-badge">{doc.type}</span>
                      </div>
                    </div>

                    <div className="doc-actions">
                      {doc.status === 'verified' && (
                        <span className="verified-tag">✓ Verified</span>
                      )}
                      {doc.status === 'warning' && (
                        <button
                          onClick={() => handleRequestDoc(member.name, doc.title)}
                          className="action-btn-warning"
                        >
                          Renew Soon
                        </button>
                      )}
                      {doc.status === 'missing' && (
                        <button
                          onClick={() => handleRequestDoc(member.name, doc.title)}
                          className="action-btn-request"
                        >
                          Request File
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer actions */}
            <div className="member-card-footer">
              <button className="footer-btn secondary">View Vault</button>
              <button 
                onClick={() => handleRequestDoc(member.name, 'All Missing Documents')}
                className="footer-btn primary"
              >
                Send Secure Ping
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Slide-over Invite Modal ─── */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-950">Invite Family Member</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="close-btn">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="modal-body space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shalini Kumar"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Relationship</label>
                <select
                  value={newMember.relationship}
                  onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })}
                  className="input-field"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Child">Child</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@family.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Access Role</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="input-field"
                >
                  <option value="Viewer">Viewer (Read Only)</option>
                  <option value="Contributor">Contributor (Upload & View)</option>
                  <option value="Trustee">Trustee (Emergency Access Role)</option>
                </select>
              </div>

              <div className="info-box flex gap-2 rounded-xl bg-slate-50 p-3 text-slate-500 text-xs">
                <Info className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <p>
                  Inviting a family member grants them access to securely share identity, medical, and financial records within the ledger.
                </p>
              </div>

              <div className="modal-footer pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

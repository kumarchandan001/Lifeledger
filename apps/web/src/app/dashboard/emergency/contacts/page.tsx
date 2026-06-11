'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Edit3, User, Mail, Phone, Heart } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  relationship: string;
}

export default function TrustedContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: 'Spouse',
  });

  const fetchContacts = async () => {
    try {
      const res = await api.get('/emergency/contacts');
      setContacts(res.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load trusted contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const openAddModal = () => {
    setForm({ name: '', email: '', phone: '', relationship: 'Spouse' });
    setIsEditing(false);
    setShowModal(true);
  };

  const openEditModal = (c: Contact) => {
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone || '',
      relationship: c.relationship,
    });
    setCurrentId(c.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.patch(`/emergency/contacts/${currentId}`, form);
        toast.success('Trusted contact updated');
      } else {
        await api.post('/emergency/contacts', form);
        toast.success('Trusted contact added');
      }
      setShowModal(false);
      fetchContacts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this trusted contact?')) return;
    try {
      await api.delete(`/emergency/contacts/${id}`);
      toast.success('Trusted contact removed');
      fetchContacts();
    } catch (err) {
      toast.error('Failed to remove contact');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground animate-pulse">Loading trusted contacts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Your Designated Trusted Contacts</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Designate individuals who can request access to your vault. No automatic access is granted.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center space-x-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Contact</span>
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
            <User className="h-6 w-6" />
          </div>
          <h4 className="font-semibold text-lg text-foreground">No Trusted Contacts</h4>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
            You haven't added any trusted contacts yet. Designate at least one contact so they can assist in emergencies.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            Add Contact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-foreground text-lg leading-tight">{c.name}</h4>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full mt-2">
                      <Heart className="h-3.5 w-3.5 fill-current" />
                      {c.relationship}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground pt-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground/60" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground/60" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border mt-6 pt-4">
                <button
                  onClick={() => openEditModal(c)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Edit Contact"
                >
                  <Edit3 className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Remove Contact"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold">{isEditing ? 'Edit Trusted Contact' : 'Add Trusted Contact'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. jane.doe@example.com"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Relationship</label>
                <select
                  value={form.relationship}
                  onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Lawyer">Lawyer</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Executor">Executor</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-border bg-muted/50 hover:bg-muted text-foreground rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold transition-colors"
                >
                  {isEditing ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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
          <p className="text-muted-foreground mt-0.5 text-sm">
            Designate individuals who can request access to your vault. No automatic access is
            granted.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center space-x-1.5 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add Contact</span>
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center shadow-sm">
          <div className="bg-muted text-muted-foreground mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <User className="h-6 w-6" />
          </div>
          <h4 className="text-foreground text-lg font-semibold">No Trusted Contacts</h4>
          <p className="text-muted-foreground mt-1 mb-6 max-w-sm text-sm">
            You haven't added any trusted contacts yet. Designate at least one contact so they can
            assist in emergencies.
          </p>
          <button
            onClick={openAddModal}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all"
          >
            Add Contact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="bg-card border-border relative flex flex-col justify-between overflow-hidden rounded-xl border p-6 transition-all hover:shadow-md"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-foreground text-lg leading-tight font-bold">{c.name}</h4>
                    <span className="bg-primary/10 text-primary mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
                      <Heart className="h-3.5 w-3.5 fill-current" />
                      {c.relationship}
                    </span>
                  </div>
                </div>

                <div className="text-muted-foreground space-y-2 pt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="text-muted-foreground/60 h-4 w-4" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="text-muted-foreground/60 h-4 w-4" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-border mt-6 flex items-center justify-end gap-2 border-t pt-4">
                <button
                  onClick={() => openEditModal(c)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-2 transition-colors"
                  title="Edit Contact"
                >
                  <Edit3 className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-muted-foreground hover:text-destructive rounded-lg p-2 transition-colors hover:bg-red-500/10"
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
        <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border-border animate-in zoom-in-95 w-full max-w-md space-y-4 rounded-xl border p-6 shadow-lg duration-200">
            <h3 className="text-xl font-bold">
              {isEditing ? 'Edit Trusted Contact' : 'Add Trusted Contact'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-semibold">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Jane Doe"
                  className="bg-background border-input focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-semibold">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. jane.doe@example.com"
                  className="bg-background border-input focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-semibold">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="bg-background border-input focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-semibold">Relationship</label>
                <select
                  value={form.relationship}
                  onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                  className="bg-background border-input focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
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
                  className="border-border bg-muted/50 hover:bg-muted text-foreground rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
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

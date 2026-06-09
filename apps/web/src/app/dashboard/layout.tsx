'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import './dashboard.css';

const NAV_ITEMS = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    ],
  },
  {
    section: 'Documents',
    items: [
      { label: 'All Documents', href: '/dashboard/documents', icon: '📄' },
      { label: 'Categories', href: '/dashboard/categories', icon: '📁' },
      { label: 'Intelligence', href: '/dashboard/intelligence', icon: '🧠' },
    ],
  },
  {
    section: 'Alerts',
    items: [
      { label: 'Notifications', href: '/dashboard/notifications', icon: '🔔' },
    ],
  },
  {
    section: 'Settings',
    items: [
      { label: 'Preferences', href: '/dashboard/settings/preferences', icon: '⚙️' },
      { label: 'Sessions', href: '/settings/sessions', icon: '🔐' },
    ],
  },
];

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, checkAuth, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isAuthenticated && typeof window !== 'undefined') {
      const token = localStorage.getItem('lifeledger_access_token');
      if (!token) {
        router.push('/login');
      }
    }
  }, [isAuthenticated, router]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data?.count ?? 0);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchRecentNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications', {
        params: { limit: 5, sortOrder: 'desc' },
      });
      setRecentNotifications(res.data?.notifications ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchUnreadCount]);

  useEffect(() => {
    if (bellOpen) {
      fetchRecentNotifications();
    }
  }, [bellOpen, fetchRecentNotifications]);

  // Close bell dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EXPIRY_WARNING': return '⏰';
      case 'DOCUMENT_EXPIRED': return '🚨';
      case 'SECURITY_ALERT': return '🔒';
      case 'ACCOUNT_ACTIVITY': return '👤';
      default: return '📢';
    }
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const currentTitle = NAV_ITEMS
    .flatMap((s) => s.items)
    .find((item) => pathname === item.href)?.label ?? 'Dashboard';

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">LifeLedger</div>
          <div className="sidebar-logo-sub">Digital Life Manager</div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((section) => (
            <div key={section.section} className="sidebar-section">
              <div className="sidebar-section-title">{section.section}</div>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  {item.label}
                  {item.label === 'Notifications' && unreadCount > 0 && (
                    <span className="sidebar-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Topbar */}
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button
              className="topbar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <h1 className="topbar-title">{currentTitle}</h1>
          </div>

          <div className="topbar-right">
            {/* Notification Bell */}
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                className="notification-bell"
                onClick={() => setBellOpen(!bellOpen)}
                aria-label="Notifications"
                id="notification-bell"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="notification-bell-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="notification-dropdown">
                  <div className="dropdown-header">
                    <h3>Notifications</h3>
                    <Link href="/dashboard/notifications" className="dropdown-link" onClick={() => setBellOpen(false)}>
                      View all
                    </Link>
                  </div>
                  <div className="dropdown-body">
                    {recentNotifications.length === 0 ? (
                      <div className="dropdown-empty">
                        🔔 No notifications yet
                      </div>
                    ) : (
                      recentNotifications.map((n) => (
                        <div
                          key={n.id}
                          className={`dropdown-item ${n.status === 'UNREAD' ? 'unread' : ''}`}
                          onClick={() => {
                            setBellOpen(false);
                            router.push('/dashboard/notifications');
                          }}
                        >
                          <div
                            className="dropdown-item-icon"
                            style={{
                              background: n.type === 'EXPIRY_WARNING' ? '#fffbeb'
                                : n.type === 'DOCUMENT_EXPIRED' ? '#fef2f2'
                                : n.type === 'SECURITY_ALERT' ? '#fef2f2'
                                : '#eff6ff',
                            }}
                          >
                            {getNotificationIcon(n.type)}
                          </div>
                          <div className="dropdown-item-content">
                            <div className="dropdown-item-title">{n.title}</div>
                            <div className="dropdown-item-message">{n.message}</div>
                            <div className="dropdown-item-time">{getTimeAgo(n.createdAt)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            <button className="user-avatar-btn" onClick={handleLogout} title="Logout">
              {getInitials(user?.fullName)}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}

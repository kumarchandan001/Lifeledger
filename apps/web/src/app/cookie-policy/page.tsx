'use client';

import Link from 'next/link';

export default function CookiePolicyPage() {
  return (
    <div style={{ background: '#0a0e17', minHeight: '100vh', color: '#cbd5e0', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <Link href="/" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700, fontSize: '1.25rem' }}>
            LifeLedger
          </Link>
          <h1 style={{ fontSize: '2.25rem', color: '#fff', marginTop: '1rem', fontWeight: 800 }}>Cookie Policy</h1>
          <p style={{ color: '#718096', fontSize: '0.9rem', marginTop: '0.5rem' }}>Last updated: June 14, 2026</p>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>1. What Are Cookies</h2>
            <p>
              Cookies are small text files placed on your computer or mobile device by websites that you visit. They are widely used to make websites work, or work more efficiently, as well as to provide info to the owners of the site.
            </p>
          </div>

          <div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>2. How We Use Cookies</h2>
            <p>
              We use cookies for the following purposes:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Authentication (Strictly Necessary):</strong> We use httpOnly cookies (`lifeledger_refresh_token`) to secure and rotate refresh tokens for active sessions. These cookies are essential for you to stay logged in.</li>
              <li><strong>Session Identification:</strong> Local storage is utilized to maintain access tokens for authentication state management.</li>
              <li><strong>Functional Cookies:</strong> Cookies store user preferences such as interface language, dark mode display settings, and dashboard sidebar toggle state.</li>
              <li><strong>Analytics (Performance):</strong> If opted-in, PostHog utilizes tracking tokens to record activation conversions, DAU/WAU metrics, and performance latency.</li>
            </ul>
          </div>

          <div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>3. How to Manage Cookies</h2>
            <p>
              Most web browsers allow you to control cookies through browser settings. You can choose to block all cookies, delete existing cookies, or receive alerts before a cookie is stored. Please note that blocking or deleting strictly necessary cookies will prevent you from logging in and utilizing your dashboard vault on LifeLedger.
            </p>
          </div>
        </section>

        <footer style={{ marginTop: '4rem', textAlign: 'center', borderTop: '1px solid #2d3748', paddingTop: '1.5rem' }}>
          <Link href="/dashboard" style={{ color: '#a0aec0', fontSize: '0.88rem', marginRight: '1rem', textDecoration: 'none' }}>Dashboard</Link>
          <Link href="/privacy" style={{ color: '#a0aec0', fontSize: '0.88rem', marginRight: '1rem', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: '#a0aec0', fontSize: '0.88rem', textDecoration: 'none' }}>Terms of Service</Link>
        </footer>
      </div>
    </div>
  );
}

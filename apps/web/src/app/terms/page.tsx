'use client';

import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div style={{ background: '#0a0e17', minHeight: '100vh', color: '#cbd5e0', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <Link href="/" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700, fontSize: '1.25rem' }}>
            LifeLedger
          </Link>
          <h1 style={{ fontSize: '2.25rem', color: '#fff', marginTop: '1rem', fontWeight: 800 }}>Terms of Service</h1>
          <p style={{ color: '#718096', fontSize: '0.9rem', marginTop: '0.5rem' }}>Last updated: June 14, 2026</p>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>1. Agreement to Terms</h2>
            <p>
              By accessing or using LifeLedger, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not access or use the platform.
            </p>
          </div>

          <div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>2. User Account & Security</h2>
            <p>
              You are responsible for safeguarding the credentials you use to access LifeLedger and for any activities or actions under your password. You agree to notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
            </p>
          </div>

          <div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>3. Subscription & Billing</h2>
            <p>
              We offer both free tier accounts and premium tier subscription options. Subscriptions are billed on a recurring monthly or yearly cycle, and fees are processed through authorized merchant partners. You can cancel your subscription at any time. Accounts with suspended status due to billing failures will fall back to free storage tier restrictions.
            </p>
          </div>

          <div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>4. Legacy Vault & Emergency Access</h2>
            <p>
              LifeLedger allows you to delegate emergency access or legacy directive disclosures to designated beneficiaries. You acknowledge that trusted contacts will gain read-only access to files inside your emergency vault ONLY after verification workflows (waiting periods and request approvals) are satisfied. You assume full legal responsibility for designating trusted contacts and nominating beneficiaries.
            </p>
          </div>

          <div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>5. Limitation of Liability</h2>
            <p>
              LifeLedger does not guarantee absolute safety against unforeseen data loss due to hardware failures or cloud service outages. It is recommended to keep secondary backups. Under no circumstances shall LifeLedger or its operators be held liable for indirect, incidental, or consequential damages resulting from platform service interruptions.
            </p>
          </div>
        </section>

        <footer style={{ marginTop: '4rem', textAlign: 'center', borderTop: '1px solid #2d3748', paddingTop: '1.5rem' }}>
          <Link href="/dashboard" style={{ color: '#a0aec0', fontSize: '0.88rem', marginRight: '1rem', textDecoration: 'none' }}>Dashboard</Link>
          <Link href="/privacy" style={{ color: '#a0aec0', fontSize: '0.88rem', marginRight: '1rem', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/cookie-policy" style={{ color: '#a0aec0', fontSize: '0.88rem', textDecoration: 'none' }}>Cookie Policy</Link>
        </footer>
      </div>
    </div>
  );
}

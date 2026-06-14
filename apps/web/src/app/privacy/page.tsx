'use client';

import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ background: '#0a0e17', minHeight: '100vh', color: '#cbd5e0', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <Link href="/" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700, fontSize: '1.25rem' }}>
            LifeLedger
          </Link>
          <h1 style={{ fontSize: '2.25rem', color: '#fff', marginTop: '1rem', fontWeight: 800 }}>Privacy Policy</h1>
          <p style={{ color: '#718096', fontSize: '0.9rem', marginTop: '0.5rem' }}>Last updated: June 14, 2026</p>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', lineHeight: '1.7', fontSize: '0.95rem' }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>1. Introduction</h2>
            <p>
              Welcome to LifeLedger. We respect your privacy and are committed to protecting your personal data. This privacy policy informs you about how we look after your personal data when you visit our website and use our digital life management tools, and tells you about your privacy rights and how the law protects you.
            </p>
          </div>

          <div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>2. Data We Collect</h2>
            <p>
              We collect, use, store, and transfer different kinds of personal data about you which we have grouped together as follows:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Identity Data:</strong> Full name, username, date of birth, gender.</li>
              <li><strong>Contact Data:</strong> Email address, telephone numbers, and trusted emergency contacts.</li>
              <li><strong>Financial Data:</strong> Subscription details, billing history, and payment method reference tokens (we do not store raw credit cards).</li>
              <li><strong>User Vault Documents:</strong> Encrypted document files, metadata (issue date, expiry date, issuer), and OCR text files parsed for AI analysis.</li>
            </ul>
          </div>

          <div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>3. How We Secure Your Data</h2>
            <p>
              Security is the core foundation of LifeLedger. All documents are stored in secure cloud storage buckets (S3 / Cloudinary) with timed, presigned URL access mechanisms. Critical files can be marked as sensitive to enforce Multi-Factor Authentication (MFA) challenges before decryption. We employ industry-standard JWT refresh token rotation, strict authorization checks (preventing cross-tenant access), and robust audit trails for all operations.
            </p>
          </div>

          <div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>4. GDPR Compliance & Data Control</h2>
            <p>
              If you are located within the European Economic Area (EEA), you possess specific legal rights under the General Data Protection Regulation (GDPR). We extend these controls globally to all LifeLedger users:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Right to Export (Data Portability):</strong> You can request a complete download of your digital footprint from your Support/Privacy Center at any time.</li>
              <li><strong>Right to Erasure (Right to be Forgotten):</strong> You can trigger a permanent erasure of your account, purging all storage files, OCR texts, profile configurations, and audit trails.</li>
              <li><strong>Right to Restrict Processing:</strong> You can manage or revoke AI document intelligence classification consent in settings.</li>
            </ul>
          </div>

          <div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem' }}>5. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or our data safety operations, please open a support ticket or email us at <strong>privacy@lifeledger.in</strong>.
            </p>
          </div>
        </section>

        <footer style={{ marginTop: '4rem', textAlign: 'center', borderTop: '1px solid #2d3748', paddingTop: '1.5rem' }}>
          <Link href="/dashboard" style={{ color: '#a0aec0', fontSize: '0.88rem', marginRight: '1rem', textDecoration: 'none' }}>Dashboard</Link>
          <Link href="/terms" style={{ color: '#a0aec0', fontSize: '0.88rem', marginRight: '1rem', textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/cookie-policy" style={{ color: '#a0aec0', fontSize: '0.88rem', textDecoration: 'none' }}>Cookie Policy</Link>
        </footer>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'LifeLedger — Your Digital Life, Organized',
    template: '%s | LifeLedger',
  },
  description:
    'Securely store, organize, search, and manage all your important life records in one place. Identity documents, medical records, insurance, property, and more.',
  keywords: [
    'document management',
    'digital vault',
    'life records',
    'identity documents',
    'medical records',
    'insurance tracker',
    'document organizer',
    'LifeLedger',
  ],
  authors: [{ name: 'LifeLedger Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'LifeLedger',
    title: 'LifeLedger — Your Digital Life, Organized',
    description: 'AI-powered Digital Life Management Platform',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

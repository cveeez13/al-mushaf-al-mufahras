import type { Metadata, Viewport } from 'next';
import './globals.css';
import AuthProviders from '@/components/AuthProviders';

export const viewport: Viewport = {
  themeColor: '#C9A351',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'المصحف المفهرس بالمواضيع',
  description: 'المصحف المفهرس بالمواضيع بالألوان حسب الموضوعات',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'المصحف المفهرس بالمواضيع',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <a href="#main-content" className="skip-link">
          تخطي إلى المحتوى — Skip to content
        </a>
        <AuthProviders>{children}</AuthProviders>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'آية اليوم — المصحف المفهرس',
  description: 'Verse of the Day widget from Al-Mushaf Al-Mufahras',
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: `
          body { margin: 0; padding: 8px; background: transparent; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}

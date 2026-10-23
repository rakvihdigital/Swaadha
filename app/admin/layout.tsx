import type { Metadata, Viewport } from 'next';
import './admin.css';
import { display, body, header } from '../fonts';
import { AdminShell } from '@/components/admin/shell';

// No title here on purpose: each admin page renders its own <title>, and a layout title
// would override it after client-side navigation.
export const metadata: Metadata = { robots: { index: false } };

export const viewport: Viewport = { themeColor: '#a8151e' };

// The admin shell (sign-in, sidebar, shared data, edit dialogs) lives here so it carries across
// /admin/dashboard, /admin/products, …; each folder's page.tsx renders that page's content.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${header.variable}`}>
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}

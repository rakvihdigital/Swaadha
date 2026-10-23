'use client';
import { useEffect, useState } from 'react';
import { AdminContext, useAdmin, useAdminState } from './context';
import { AdminLogin } from './login';
import { AdminSidebar } from './sidebar';
import { AdminTopBar } from './top-bar';
import { AdminPageHeading } from './page-heading';
import { AdminDialogs } from './dialogs';

/**
 * The admin frame, rendered once by app/admin/layout.tsx so the session and loaded data carry
 * across pages. Each page in app/admin/<name>/page.tsx appears where {children} is.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = useAdminState();
  return (
    <AdminContext.Provider value={admin}>
      <AdminFrame>{children}</AdminFrame>
    </AdminContext.Provider>
  );
}

function AdminFrame({ children }: { children: React.ReactNode }) {
  const { ready, member } = useAdmin();

  if (!ready) {
    return (
      <div className="admin-login-wrapper">
        <p className="empty">Checking your kitchen access…</p>
      </div>
    );
  }

  if (!member) return <AdminLogin />;
  return <SignedInFrame>{children}</SignedInFrame>;
}

function SignedInFrame({ children }: { children: React.ReactNode }) {
  const { tab, can, error, notice, loading, from, to } = useAdmin();
  // On phones the sidebar is a slide-in drawer.
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => setNavOpen(false), [tab]);

  useEffect(() => {
    if (!navOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false);
    const desktop = window.matchMedia('(min-width: 961px)');
    const onWide = () => desktop.matches && setNavOpen(false);
    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onWide);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onWide);
    };
  }, [navOpen]);

  return (
    <div className="admin-page admin-expanded">
      <AdminSidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className={`admin-nav-backdrop ${navOpen ? 'is-open' : ''}`} onClick={() => setNavOpen(false)} aria-hidden="true" />

      <div className="admin-main">
        {/* Only visible when printing a report. */}
        <div className="print-letterhead">
          <img src="/logo.png" alt="Swaadha" />
          <div>
            <h2>Kitchen activity report</h2>
            <p>
              {from} to {to} · India Standard Time
            </p>
          </div>
        </div>

        <AdminTopBar onMenu={() => setNavOpen(true)} />

        {!can(tab) ? (
          <p className="empty">No tabs are assigned to your account. Ask the owner to grant access.</p>
        ) : (
          <div key={tab} className="admin-view">
            <AdminPageHeading />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="success">
                {notice}
              </p>
            )}
            {loading && (
              <p className="loading-line" role="status">
                Refreshing your kitchen data…
              </p>
            )}
            {children}
          </div>
        )}

        <AdminDialogs />
      </div>
    </div>
  );
}

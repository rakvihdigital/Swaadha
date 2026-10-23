'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ChevronRight, X } from 'lucide-react';
import { useAdmin } from './context';
import { navigation } from './config';

/** The crimson menu on the left: one link per admin page this person may open. On phones it slides in as a drawer. */
export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tab, can, member } = useAdmin();

  return (
    <aside className={`admin-sidebar ${open ? 'is-open' : ''}`} aria-label="Admin menu">
      <div className="admin-brand-row">
        <Link href="/" className="admin-brand">
          <img src="/logo-transparent.png" alt="Swaadha" />
        </Link>
        <button className="admin-nav-close" aria-label="Close menu" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <span>KITCHEN MANAGEMENT</span>
      <div className="admin-navigation">
        {navigation
          .filter((n) => can(n.id))
          .map(({ id, label, icon: Icon }) => (
            <Link key={id} href={`/admin/${id}`} onClick={onClose} className={tab === id ? 'current' : ''} aria-current={tab === id ? 'page' : undefined}>
              <Icon size={18} />
              {label}
              {tab === id && <ChevronRight size={14} />}
            </Link>
          ))}
      </div>
      <div className="sidebar-bottom">
        <div className="admin-person">
          <span>{member?.name?.charAt(0) || 'S'}</span>
          <div>
            <b>{member?.name || 'Kitchen admin'}</b>
            <small>{member?.role === 'owner' ? 'Owner · all access' : 'Assigned tabs only'}</small>
          </div>
        </div>
        <Link href="/" className="back-store" onClick={onClose}>
          <ArrowLeft size={16} /> Visit storefront <ArrowUpRight size={13} />
        </Link>
      </div>
    </aside>
  );
}

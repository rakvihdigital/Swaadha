'use client';
import { Plus } from 'lucide-react';
import { tabLabels } from '@/lib/admin';
import { useAdmin } from './context';
import { defaultBanner, defaultCoupon, defaultProduct, pageIntros } from './config';

/** Page title, intro line, and the page's "Add …" button. */
export function AdminPageHeading() {
  const { tab, member, categories, banners, setProductEdit, setCategoryEdit, setBannerEdit, setCouponEdit, setMemberEdit } = useAdmin();

  return (
    <div className="admin-page-heading">
      <div>
        <div className="eyebrow">{tab === 'dashboard' ? 'A LITTLE OVERVIEW. A LOT OF POSSIBILITIES.' : 'YOUR KITCHEN, BEAUTIFULLY ORGANIZED.'}</div>
        <h1>
          {tab === 'dashboard' ? `Hello, ${member?.name.split(' ')[0]}.` : tabLabels[tab]}
          <span className="heading-dot">✳</span>
        </h1>
        <p>{pageIntros[tab]}</p>
      </div>

      {tab === 'products' && (
        <button
          className="button"
          onClick={() => setProductEdit({ ...defaultProduct, category: categories[0]?.name || '' })}
          disabled={!categories.length}
        >
          <Plus size={17} /> Add product
        </button>
      )}
      {tab === 'categories' && (
        <button className="button" onClick={() => setCategoryEdit({ name: '', description: '', enabled: true })}>
          <Plus size={17} /> Add category
        </button>
      )}
      {tab === 'banners' && (
        <button className="button" onClick={() => setBannerEdit({ ...defaultBanner, display_order: banners.length + 1 })}>
          <Plus size={17} /> Add hero banner
        </button>
      )}
      {tab === 'coupons' && (
        <button className="button" onClick={() => setCouponEdit({ ...defaultCoupon })}>
          <Plus size={17} /> Add coupon
        </button>
      )}
      {tab === 'team' && (
        <button className="button" onClick={() => setMemberEdit({ user_id: '', name: '', email: '', role: 'staff', permissions: [] })}>
          <Plus size={17} /> Add sub-admin
        </button>
      )}
    </div>
  );
}

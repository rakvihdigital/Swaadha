'use client';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { useAdmin } from '@/components/admin/context';

export default function BannersPage() {
  const {
    banners,
    busy,
    deleteBanner,
    matchedBanners,
    query,
    setBannerEdit,
    setQuery,
    toggleBanner,
  } = useAdmin();
  return (
    <>
      <title>Hero banners · Kitchen admin | Swaadha</title>
      <div className="listing-toolbar">
        <span>{banners.length} hero banners loaded</span>
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search banners"
            placeholder="Search title, tag, or label"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Banner image</th>
              <th>Heading & tag</th>
              <th>Storefront link</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {matchedBanners.map((b) => (
              <tr key={b.id}>
                <td>
                  <b>#{b.display_order}</b>
                </td>
                <td>
                  <div className="table-product">
                    <img src={b.image} alt={b.title} style={{ width: 68, height: 42, objectFit: 'cover', borderRadius: 4 }} />
                    <div>
                      <b>{b.label || 'Hero slide'}</b>
                    </div>
                  </div>
                </td>
                <td>
                  <b>
                    {b.title} <em>{b.em}</em>
                  </b>
                  <br />
                  <small>{b.tag}</small>
                </td>
                <td>
                  <small>{b.href}</small>
                </td>
                <td>
                  <button
                    disabled={busy}
                    className={`status ${b.is_active ? 'available' : ''}`}
                    onClick={() => toggleBanner(b)}
                  >
                    {b.is_active ? 'Active' : 'Draft'}
                  </button>
                </td>
                <td>
                  <div className="order-list-actions">
                    <button className="table-action" aria-label={`Edit ${b.title}`} onClick={() => setBannerEdit(b)}>
                      <Pencil size={15} /> Edit
                    </button>
                    <button className="table-action" aria-label={`Delete ${b.title}`} onClick={() => deleteBanner(b)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!matchedBanners.length && <p className="empty">No banners found. Add a hero banner to feature on your home page.</p>}
      </div>
      <p className="table-help">
        Active banners are displayed automatically in the hero slider on the homepage. You can upload photos directly to the Supabase <code>banners</code> storage bucket.
      </p>
    </>
  );
}

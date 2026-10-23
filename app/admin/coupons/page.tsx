'use client';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { useAdmin } from '@/components/admin/context';
import { money } from '@/lib/admin';

export default function CouponsPage() {
  const {
    busy,
    coupons,
    deleteCoupon,
    matchedCoupons,
    query,
    setCouponEdit,
    setQuery,
    toggleCoupon,
  } = useAdmin();
  return (
    <>
      <title>Coupons & offers · Kitchen admin | Swaadha</title>
      <div className="listing-toolbar">
        <span>{coupons.length} promotional coupons</span>
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search coupons"
            placeholder="Search coupon code or description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Min order</th>
              <th>Usage</th>
              <th>Expiry date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {matchedCoupons.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong style={{ letterSpacing: '1px', color: 'var(--red)' }}>{c.code}</strong>
                  <br />
                  <small>{c.description || 'Promotional coupon'}</small>
                </td>
                <td>
                  <b>{c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} flat off`}</b>
                  {c.max_discount ? (
                    <small>
                      <br />
                      Up to ₹{c.max_discount}
                    </small>
                  ) : null}
                </td>
                <td>{c.min_order_value ? money(c.min_order_value) : 'No minimum'}</td>
                <td>
                  {c.times_used} {c.usage_limit ? `/ ${c.usage_limit}` : 'uses'}
                </td>
                <td>{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('en-IN') : 'No expiry'}</td>
                <td>
                  <button
                    disabled={busy}
                    className={`status ${c.is_active ? 'available' : ''}`}
                    onClick={() => toggleCoupon(c)}
                  >
                    {c.is_active ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td>
                  <div className="order-list-actions">
                    <button className="table-action" aria-label={`Edit ${c.code}`} onClick={() => setCouponEdit(c)}>
                      <Pencil size={15} /> Edit
                    </button>
                    <button className="table-action" aria-label={`Delete ${c.code}`} onClick={() => deleteCoupon(c)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!matchedCoupons.length && <p className="empty">No coupons configured. Create a promotional code for your shoppers.</p>}
      </div>
      <p className="table-help">Customers can enter active coupon codes at cart checkout. Discounts are verified server-side.</p>
    </>
  );
}

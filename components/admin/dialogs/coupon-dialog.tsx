'use client';
import { Check } from 'lucide-react';
import { Modal } from '../modal';
import { useAdmin } from '../context';

/** Add or edit a coupon code. */
export function CouponDialog() {
  const { couponEdit, busy, error, saveCoupon, setCouponEdit } = useAdmin();
  if (!couponEdit) return null;

  return (
    <Modal title={couponEdit.id ? 'Edit coupon' : 'Add coupon code'} onClose={() => setCouponEdit(null)}>
      <form onSubmit={saveCoupon}>
        <div className="form-row">
          <label>
            Coupon code
            <input
              required
              maxLength={30}
              placeholder="e.g. SWAADHA10"
              style={{ textTransform: 'uppercase' }}
              value={couponEdit.code}
              onChange={(e) => setCouponEdit({ ...couponEdit, code: e.target.value.toUpperCase() })}
            />
          </label>
          <label>
            Discount type
            <select
              value={couponEdit.discount_type}
              onChange={(e) => setCouponEdit({ ...couponEdit, discount_type: e.target.value as 'percentage' | 'fixed' })}
            >
              <option value="percentage">Percentage discount (%)</option>
              <option value="fixed">Flat discount (₹)</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Discount value {couponEdit.discount_type === 'percentage' ? '(%)' : '(₹)'}
            <input
              required
              type="number"
              min={1}
              max={couponEdit.discount_type === 'percentage' ? 100 : 10000}
              value={couponEdit.discount_value || ''}
              onChange={(e) => setCouponEdit({ ...couponEdit, discount_value: Number(e.target.value) })}
            />
          </label>
          <label>
            Min order value (₹)
            <input
              type="number"
              min={0}
              placeholder="0 for no minimum"
              value={couponEdit.min_order_value ?? 0}
              onChange={(e) => setCouponEdit({ ...couponEdit, min_order_value: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Max discount cap (₹, optional)
            <input
              type="number"
              min={1}
              placeholder="Unlimited if empty"
              value={couponEdit.max_discount ?? ''}
              onChange={(e) => setCouponEdit({ ...couponEdit, max_discount: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
          <label>
            Usage limit (optional)
            <input
              type="number"
              min={1}
              placeholder="Unlimited if empty"
              value={couponEdit.usage_limit ?? ''}
              onChange={(e) => setCouponEdit({ ...couponEdit, usage_limit: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Expiry date (optional)
            <input
              type="date"
              value={couponEdit.expiry_date ? couponEdit.expiry_date.slice(0, 10) : ''}
              onChange={(e) => setCouponEdit({ ...couponEdit, expiry_date: e.target.value ? e.target.value : null })}
            />
          </label>
          <label>
            Description
            <input
              maxLength={200}
              placeholder="e.g. 10% off on all sweets"
              value={couponEdit.description}
              onChange={(e) => setCouponEdit({ ...couponEdit, description: e.target.value })}
            />
          </label>
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={couponEdit.is_active}
            onChange={(e) => setCouponEdit({ ...couponEdit, is_active: e.target.checked })}
          />{' '}
          Active (can be applied at checkout)
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button modal-save" disabled={busy}>
          <Check size={16} /> Save coupon
        </button>
      </form>
    </Modal>
  );
}

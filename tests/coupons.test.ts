import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCoupon, Coupon } from '../lib/admin';

test('Percentage coupon calculates correct discount with and without cap', () => {
  const coupon: Coupon = {
    id: 'test-1',
    code: 'TEST10',
    description: '10% off',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_value: 200,
    max_discount: 50,
    expiry_date: null,
    usage_limit: null,
    times_used: 0,
    is_active: true,
  };

  // Min order value not met
  const underMin = evaluateCoupon(coupon, 150);
  assert.equal(underMin.valid, false);
  assert.equal(underMin.discount, 0);

  // Normal calculation: 10% of 300 = 30 (below cap of 50)
  const valid = evaluateCoupon(coupon, 300);
  assert.equal(valid.valid, true);
  assert.equal(valid.discount, 30);

  // Exceeding cap: 10% of 1000 = 100, but capped at 50
  const capped = evaluateCoupon(coupon, 1000);
  assert.equal(capped.valid, true);
  assert.equal(capped.discount, 50);
});

test('Fixed coupon applies correct discount', () => {
  const coupon: Coupon = {
    id: 'test-2',
    code: 'FLAT50',
    description: 'Flat ₹50 off',
    discount_type: 'fixed',
    discount_value: 50,
    min_order_value: 200,
    max_discount: null,
    expiry_date: null,
    usage_limit: null,
    times_used: 0,
    is_active: true,
  };

  const valid = evaluateCoupon(coupon, 250);
  assert.equal(valid.valid, true);
  assert.equal(valid.discount, 50);
});

test('Inactive or expired coupons are rejected', () => {
  const baseCoupon: Coupon = {
    id: 'test-base',
    code: 'WELCOME10',
    description: 'Welcome coupon',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_value: 200,
    max_discount: 100,
    expiry_date: null,
    usage_limit: null,
    times_used: 0,
    is_active: true,
  };

  const inactiveCoupon: Coupon = {
    ...baseCoupon,
    is_active: false,
  };
  const resInactive = evaluateCoupon(inactiveCoupon, 500);
  assert.equal(resInactive.valid, false);

  const expiredCoupon: Coupon = {
    ...baseCoupon,
    expiry_date: '2020-01-01T00:00:00Z',
  };
  const resExpired = evaluateCoupon(expiredCoupon, 500);
  assert.equal(resExpired.valid, false);
});

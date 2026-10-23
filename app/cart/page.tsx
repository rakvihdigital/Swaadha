'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Check, LockKeyhole, ShoppingBag, Tag, Trash2, Truck, X } from 'lucide-react';
import { useAuthUI } from '@/components/auth-dialog';
import { useCommerce } from '@/components/commerce';
import { loadMenu, validateCouponCode } from '@/lib/storefront';
import { Product } from '@/lib/products';
import { money } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

function earliest() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function Cart() {
  const { openLogin } = useAuthUI();
  const { cart, quantity, remove, clear, ready } = useCommerce();
  const [menu, setMenu] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pin, setPin] = useState('');
  const [date, setDate] = useState(earliest);
  const [checkoutKey, setCheckoutKey] = useState('');
  const [authReady, setAuthReady] = useState(!supabase);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_amount: number; message: string } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    loadMenu()
      .then((d) => {
        setMenu(d.products);
        setLoaded(true);
      })
      .catch((e) => setError(e.message));

    if (!supabase) return;
    const client = supabase;
    async function check() {
      const {
        data: { user },
      } = await client.auth.getUser();
      setUser(user);
      setAuthReady(true);
      if (user?.user_metadata?.name) setName(String(user.user_metadata.name));
    }
    check();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => setTimeout(check, 0));
    return () => subscription.unsubscribe();
  }, []);

  // Fingerprint for checkout session
  useEffect(() => {
    if (!ready || !authReady) return;
    const fingerprint = (user?.id || 'guest') + JSON.stringify(cart.map((i) => [i.product.id, i.quantity]));
    let previous;
    try {
      previous = JSON.parse(sessionStorage.getItem('swaadha-checkout-attempt') || 'null');
    } catch {}
    const key = previous?.fingerprint === fingerprint ? previous.key : crypto.randomUUID();
    sessionStorage.setItem('swaadha-checkout-attempt', JSON.stringify({ fingerprint, key }));
    setCheckoutKey(key);
  }, [cart, user, ready, authReady]);

  const rows = cart.map((item) => ({ ...item, current: menu.find((p) => p.id === item.product.id) }));
  const invalid = !loaded || rows.some((i) => !i.current || i.quantity > (i.current.stock ?? 0));
  const subtotal = rows.reduce((sum, item) => sum + Number(item.current?.price ?? item.product.price) * item.quantity, 0);
  const discount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const finalTotal = Math.max(0, subtotal - discount);

  // Re-verify coupon if subtotal changes
  useEffect(() => {
    if (appliedCoupon && subtotal > 0) {
      validateCouponCode(appliedCoupon.code, subtotal).then((res) => {
        if (!res.valid) {
          setAppliedCoupon(null);
          setCouponError(res.message);
          setCouponSuccess('');
        } else {
          setAppliedCoupon({ code: appliedCoupon.code, discount_amount: res.discount_amount, message: res.message });
        }
      });
    }
  }, [subtotal]);

  async function applyCoupon(e: FormEvent) {
    e.preventDefault();
    if (!couponCode.trim() || couponBusy) return;
    setCouponBusy(true);
    setCouponError('');
    setCouponSuccess('');
    try {
      const res = await validateCouponCode(couponCode, subtotal);
      if (!res.valid) {
        setCouponError(res.message);
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discount_amount: res.discount_amount, message: res.message });
        setCouponSuccess(res.message);
      }
    } catch (err: unknown) {
      setCouponError((err as { message?: string })?.message || 'Could not validate coupon.');
    } finally {
      setCouponBusy(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponSuccess('');
    setCouponError('');
  }

  async function place(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !user || busy) return;
    setBusy(true);
    setError('');
    try {
      const latest = await loadMenu();
      setMenu(latest.products);
      if (
        cart.some((item) => {
          const p = latest.products.find((p) => p.id === item.product.id);
          return !p || item.quantity > (p.stock ?? 0);
        })
      ) {
        throw new Error('A product’s availability changed. Please review your cart.');
      }

      const payload: Record<string, unknown> = {
        p_name: name,
        p_phone: phone,
        p_address: address,
        p_city: city,
        p_state: state,
        p_pincode: pin,
        p_date: date,
        p_items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        p_checkout_key: checkoutKey,
        p_coupon_code: appliedCoupon ? appliedCoupon.code : null,
      };

      let res = await supabase.rpc('place_order', payload);
      // Fallback if place_order does not yet take p_coupon_code
      if (res.error && res.error.message && res.error.message.includes('place_order')) {
        delete payload.p_coupon_code;
        res = await supabase.rpc('place_order', payload);
      }

      if (res.error) throw res.error;
      setSuccess(String(res.data));
      sessionStorage.removeItem('swaadha-checkout-attempt');
      clear();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Could not place your order. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <section className="section order-success">
        <span>
          <Check size={34} />
        </span>
        <div className="eyebrow">A LITTLE GOODNESS IS ON ITS WAY</div>
        <h1>
          Your order
          <br />
          is <em>in the kitchen.</em>
        </h1>
        <p>
          Order #{success.slice(0, 8).toUpperCase()} has been placed.
          <br />
          Payment: cash on delivery. Your kitchen will confirm preparation and delivery.
        </p>
        <Link className="button" href="/account">
          View my orders & invoice
        </Link>
      </section>
    );
  }

  return (
    <section className="section cart-page">
      <div className="eyebrow">
        <ShoppingBag size={13} /> YOUR BAG OF GOODNESS
      </div>
      <h1>
        A little cart.
        <br />
        <em>A lot to love.</em>
      </h1>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {!ready ? (
        <p>Loading your cart…</p>
      ) : !cart.length ? (
        <div className="empty">
          <ShoppingBag size={40} />
          <h2>Your cart is waiting for a favorite.</h2>
          <Link className="button" href="/products">
            Explore our kitchen
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            <div className="cart-list">
              {rows.map(({ product: p, quantity: n, current }) => (
                <article className="cart-row" key={p.id}>
                  <Link href={`/products/${p.id}`}>
                    <img src={current?.image ?? p.image} alt={p.name} />
                  </Link>
                  <div>
                    <span>{p.category}</span>
                    <h3>
                      <Link href={`/products/${p.id}`}>{current?.name ?? p.name}</Link>
                    </h3>
                    <p>
                      {current?.weight ?? p.weight} · {money(current?.price ?? p.price)} per pack
                    </p>
                    {loaded && (!current || n > (current.stock ?? 0)) && (
                      <small className="cart-stock-error">
                        {current
                          ? `Only ${current.stock ?? 0} packs remain. Please reduce the quantity.`
                          : 'This favorite is no longer available.'}
                      </small>
                    )}
                    <div className="cart-row-actions">
                      <label>
                        Qty
                        <input
                          aria-label={`Quantity for ${p.name}`}
                          type="number"
                          min={1}
                          max={Math.min(current?.stock ?? 100, 100) || 1}
                          value={n}
                          onChange={(e) => quantity(p.id, Number(e.target.value))}
                        />
                      </label>
                      <button aria-label={`Remove ${p.name} from cart`} onClick={() => remove(p.id)}>
                        <Trash2 size={15} /> Remove
                      </button>
                    </div>
                  </div>
                  <strong>{money((current?.price ?? p.price) * n)}</strong>
                </article>
              ))}
            </div>

            <div className="cart-delivery-note">
              <Truck size={22} />
              <p>Prepared in fresh batches with 6–7 days lead time. Bangalore delivery: 24hrs after dispatch. Outside Bangalore: 4–10 days.</p>
            </div>
            <Link className="text-link" href="/products">
              ← A little more from the kitchen
            </Link>
          </div>

          <aside className="checkout-panel">
            <div className="eyebrow">
              <LockKeyhole size={13} /> CHECKOUT
            </div>
            <h2>
              Ready for
              <br />
              <em>some goodness?</em>
            </h2>

            {/* Price breakdown */}
            <div className="checkout-summary-lines">
              <div className="checkout-total">
                <span>Products ({cart.reduce((n, i) => n + i.quantity, 0)} packs)</span>
                <strong>{money(subtotal)}</strong>
              </div>

              {appliedCoupon && (
                <div className="checkout-total coupon-discount-row">
                  <span className="coupon-applied-tag">
                    <Tag size={13} /> {appliedCoupon.code}
                    <button type="button" onClick={removeCoupon} title="Remove coupon">
                      <X size={12} />
                    </button>
                  </span>
                  <strong className="discount-amount">- {money(appliedCoupon.discount_amount)}</strong>
                </div>
              )}

              {appliedCoupon && (
                <div className="checkout-total final-total-row">
                  <span>To pay (COD)</span>
                  <strong className="final-highlight">{money(finalTotal)}</strong>
                </div>
              )}
            </div>

            {/* Coupon Code Input */}
            <form className="coupon-form" onSubmit={applyCoupon}>
              <div className="coupon-input-wrap">
                <input
                  type="text"
                  placeholder="Coupon code (e.g. WELCOME10)"
                  value={couponCode}
                  disabled={!!appliedCoupon || couponBusy}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                />
                {appliedCoupon ? (
                  <button type="button" className="coupon-btn remove" onClick={removeCoupon}>
                    Remove
                  </button>
                ) : (
                  <button type="submit" className="coupon-btn" disabled={couponBusy || !couponCode.trim()}>
                    {couponBusy ? 'Applying…' : 'Apply'}
                  </button>
                )}
              </div>
              {couponSuccess && <p className="coupon-msg-success">{couponSuccess}</p>}
              {couponError && <p className="coupon-msg-error">{couponError}</p>}
            </form>

            <p className="checkout-payment">
              <b>Cash on delivery</b> · No online payment is taken. Any additional delivery charges are confirmed separately by the kitchen.
            </p>

            {!user ? (
              <div className="checkout-login">
                <p>Sign in to securely place your order and keep track of every homemade moment.</p>
                <button className="button" onClick={() => openLogin('/cart')}>
                  Login / Register to continue
                </button>
              </div>
            ) : (
              <form onSubmit={place}>
                <label>
                  Your name
                  <input required maxLength={100} value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
                </label>
                <label>
                  Mobile number
                  <input
                    required
                    type="tel"
                    pattern="[6-9][0-9]{9}"
                    title="10-digit Indian mobile number, without +91"
                    placeholder="10-digit mobile number"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
                <label>
                  Address
                  <textarea
                    required
                    minLength={10}
                    maxLength={1000}
                    autoComplete="street-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </label>
                <div className="form-row">
                  <label>
                    City
                    <input required maxLength={30} autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} />
                  </label>
                  <label>
                    State
                    <input required maxLength={60} autoComplete="address-level1" value={state} onChange={(e) => setState(e.target.value)} />
                  </label>
                </div>
                <label>
                  Pincode
                  <input
                    required
                    inputMode="numeric"
                    pattern="[1-9][0-9]{5}"
                    autoComplete="postal-code"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                </label>
                <label>
                  Preferred dispatch date
                  <input type="date" required min={earliest()} value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
                <button className="button" disabled={busy || invalid || !checkoutKey}>
                  {busy ? 'Placing your order…' : 'Place order'}
                  <Check size={17} />
                </button>
              </form>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

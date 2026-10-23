'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Barcode,
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Minus,
  Package,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  Ticket,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ShippingPanel } from '@/components/shipping-panel';
import { Product, withDetails } from '@/lib/products';
import { BarcodeModal, generateBarcodeValue } from '@/components/barcode';
import {
  calculateMetrics,
  Category,
  exportCsv,
  getCategoryImage,
  Member,
  Metrics,
  money,
  Order,
  statuses,
  Tab,
  tabs,
  Banner,
  Coupon,
} from '@/lib/admin';
import { uploadImage } from '@/lib/storage';

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'POS Billing', icon: Store },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'banners', label: 'Hero banners', icon: ImageIcon },
  { id: 'coupons', label: 'Coupons & offers', icon: Ticket },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'reports', label: 'Analytics & reports', icon: BarChart3 },
  { id: 'team', label: 'Sub-admins & access', icon: Users },
] as const;

const emptyMetrics: Metrics = {
  total_orders: 0,
  pending: 0,
  order_value: 0,
  active_products: 0,
  daily: [],
  by_status: [],
  top_products: [],
};

const defaultProduct = {
  name: '',
  category: 'Pickles',
  description: '',
  price: 0,
  weight: '250 g',
  image: '',
  available: true,
  stock: 0,
  sku: '',
  barcode: '',
  long_description: '',
  ingredients: '',
  allergens: '',
  shelf_life: '',
  storage: '',
  net_weight_grams: 250,
};

const defaultBanner = {
  tag: 'THE SWAADHA FAMILY KITCHEN',
  title: '',
  em: '',
  text: '',
  image: '',
  label: '',
  href: '/products',
  display_order: 1,
  is_active: true,
};

const defaultCoupon = {
  code: '',
  description: '',
  discount_type: 'percentage' as const,
  discount_value: 10,
  min_order_value: 0,
  max_discount: null as number | null,
  expiry_date: null as string | null,
  usage_limit: null as number | null,
  times_used: 0,
  is_active: true,
};

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
function startDate() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLElement>('button,input,select,textarea')?.focus();

    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key === 'Tab') {
        const nodes = [
          ...dialog.current!.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]'
          ),
        ];
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = bodyOverflow;
      previous?.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop">
      <section ref={dialog} className="product-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading">
          <h2>{title}</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [ready, setReady] = useState(false);
  const [member, setMember] = useState<Member | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);

  const [from, setFrom] = useState(startDate);
  const [to, setTo] = useState(today);
  const [query, setQuery] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');

  const [productEdit, setProductEdit] = useState<(Omit<Product, 'id'> & { id?: string }) | null>(null);
  const [categoryEdit, setCategoryEdit] = useState<(Omit<Category, 'id'> & { id?: string }) | null>(null);
  const [bannerEdit, setBannerEdit] = useState<(Omit<Banner, 'id'> & { id?: string }) | null>(null);
  const [couponEdit, setCouponEdit] = useState<(Omit<Coupon, 'id'> & { id?: string }) | null>(null);
  const [memberEdit, setMemberEdit] = useState<Member | null>(null);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);

  // POS Billing Register State
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('All');
  const [posCustomerName, setPosCustomerName] = useState('Counter Customer');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Pay Later'>('Cash');
  const [posCashTendered, setPosCashTendered] = useState('');
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posReceiptOrder, setPosReceiptOrder] = useState<Order | null>(null);

  const originalStock = useRef<number | null>(null);

  function openProduct(product: Product) {
    originalStock.current = product.stock ?? 0;
    setProductEdit(withDetails(product));
  }

  const can = (t: Tab) => !!member && (member.role === 'owner' || (t !== 'team' && member.permissions.includes(t)));

  useEffect(() => {
    if (!supabase) {
      setError('Supabase client is not available.');
      setReady(true);
      return;
    }

    const client = supabase;
    let disposed = false;
    async function check() {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (disposed) return;

      if (user) {
        const { data, error } = await client.from('admins').select('*').eq('user_id', user.id).maybeSingle();
        if (disposed) return;
        if (error) {
          setError('Could not verify admin access. Run the Supabase migrations and try again.');
        } else if (data) {
          setMember({ ...data, email: data.email || user.email || '' });
        } else {
          setError('This account has no admin access. Please insert your user into public.admins via Supabase SQL Editor.');
        }
      } else {
        setMember(null);
      }
      setReady(true);
    }
    check();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => {
      setTimeout(check, 0);
    });
    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!member) return;
    const permitted = tabs.filter((t) => member.role === 'owner' || (t !== 'team' && member.permissions.includes(t)));
    if (!permitted.includes(tab)) setTab(permitted[0] ?? 'dashboard');
  }, [member, tab]);

  useEffect(() => {
    if (!supabase || !member || !from || !to || from > to) return;
    const client = supabase;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const failures: string[] = [];

      await Promise.all([
        (async () => {
          if (member!.role === 'owner' || member!.permissions.includes('products')) {
            const r = await client.from('products').select('*').order('created_at', { ascending: false });
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setProducts((r.data ?? []).map(withDetails));
          }
        })(),
        (async () => {
          if (member!.role === 'owner' || member!.permissions.some((p) => ['categories', 'products'].includes(p))) {
            const r = await client.from('categories').select('*').order('name');
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setCategories(r.data ?? []);
          }
        })(),
        (async () => {
          if (member!.role === 'owner' || member!.permissions.includes('banners')) {
            const r = await client.from('banners').select('*').order('display_order', { ascending: true });
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setBanners(r.data ?? []);
          }
        })(),
        (async () => {
          if (member!.role === 'owner' || member!.permissions.includes('coupons')) {
            const r = await client.from('coupons').select('*').order('created_at', { ascending: false });
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setCoupons(r.data ?? []);
          }
        })(),
        (async () => {
          if (member!.role === 'owner' || member!.permissions.includes('orders')) {
            const r = await client.from('orders').select('*').order('created_at', { ascending: false });
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setOrders(r.data ?? []);
          }
        })(),
        (async () => {
          if (member!.role === 'owner') {
            const r = await client.from('admins').select('*').order('name');
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setMembers(r.data ?? []);
          }
        })(),
        (async () => {
          if (member!.role === 'owner' || member!.permissions.some((p) => ['dashboard', 'reports'].includes(p))) {
            const r = await client.rpc('admin_metrics', { p_from: from, p_to: to });
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setMetrics(r.data);
          }
        })(),
      ]);

      if (!cancelled) {
        setLoading(false);
        if (failures.length) setError(failures.join(' · '));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [member, from, to, revision]);

  const report = useMemo(
    () =>
      metrics.total_orders || !orders.length
        ? metrics
        : calculateMetrics(
            orders,
            products.filter((p) => categories.some((c) => c.name === p.category && c.enabled)),
            from,
            to
          ),
    [metrics, orders, products, categories, from, to]
  );

  const matchedProducts = products.filter((p) =>
    `${p.name} ${p.category} ${p.sku || ''} ${p.barcode || ''}`.toLowerCase().includes(query.toLowerCase())
  );
  const matchedOrders = orders.filter(
    (o) => (orderStatus === 'all' || o.status === orderStatus) && `${o.id} ${o.customer_name}`.toLowerCase().includes(query.toLowerCase())
  );
  const matchedBanners = banners.filter((b) => `${b.title} ${b.tag} ${b.label}`.toLowerCase().includes(query.toLowerCase()));
  const matchedCoupons = coupons.filter((c) => `${c.code} ${c.description}`.toLowerCase().includes(query.toLowerCase()));

  async function run(task: () => Promise<void>, message: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
      setNotice(message);
      setRevision((n) => n + 1);
    } catch (e) {
      setError((e as { message?: string })?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function login(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    run(async () => {
      const r = await supabase!.auth.signInWithPassword({ email, password });
      if (r.error) throw r.error;
    }, 'Signed in.');
  }

  function saveProduct(e: FormEvent) {
    e.preventDefault();
    if (!productEdit) return;
    run(async () => {
      const { id, ...values } = productEdit;
      if (!Number.isFinite(values.price) || values.price < 0) throw new Error('Enter a valid price.');
      if (!Number.isInteger(values.stock) || Number(values.stock) < 0) throw new Error('Stock must be a whole number of packs, zero or higher.');
      if (!values.barcode || !values.barcode.trim()) {
        values.barcode = generateBarcodeValue(values.sku || values.name);
      }
      let r = id
        ? await supabase!.from('products').update(values).eq('id', id).eq('stock', originalStock.current ?? 0).select().single()
        : await supabase!.from('products').insert(values).select().single();
      if (r.error && r.error.message?.includes('barcode')) {
        const { barcode: _b, ...fallbackValues } = values;
        r = id
          ? await supabase!.from('products').update(fallbackValues).eq('id', id).eq('stock', originalStock.current ?? 0).select().single()
          : await supabase!.from('products').insert(fallbackValues).select().single();
      }
      if (r.error) {
        throw new Error(
          r.error.code === 'PGRST116'
            ? 'Stock changed while you were editing. Close and reopen the product to load the latest stock.'
            : r.error.message
        );
      }
      setProductEdit(null);
    }, 'Product saved.');
  }

  function toggleProduct(p: Product) {
    run(async () => {
      const r = await supabase!.from('products').update({ available: !p.available }).eq('id', p.id).select().single();
      if (r.error) throw r.error;
    }, 'Product visibility updated.');
  }

  function deleteProduct(p: Product) {
    if (!confirm(`Are you sure you want to delete ${p.name}?`)) return;
    run(async () => {
      const r = await supabase!.from('products').delete().eq('id', p.id);
      if (r.error) throw r.error;
    }, 'Product deleted.');
  }

  function saveCategory(e: FormEvent) {
    e.preventDefault();
    if (!categoryEdit) return;
    run(async () => {
      const { id, ...values } = categoryEdit;
      values.name = values.name.trim();
      if (!values.name) throw new Error('Category name is required.');
      let r = id
        ? await supabase!.from('categories').update(values).eq('id', id).select().single()
        : await supabase!.from('categories').insert(values).select().single();
      if (r.error && r.error.message?.includes('image')) {
        const { image: _img, ...fallbackCat } = values;
        r = id
          ? await supabase!.from('categories').update(fallbackCat).eq('id', id).select().single()
          : await supabase!.from('categories').insert(fallbackCat).select().single();
      }
      if (r.error) throw r.error;
      setCategoryEdit(null);
    }, 'Category saved.');
  }

  // POS Billing Logic
  function addToPosCart(p: Product) {
    setPosCart((prev) => {
      const existing = prev.find((item) => item.product.id === p.id);
      if (existing) {
        return prev.map((item) => (item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { product: p, quantity: 1 }];
    });
  }

  function updatePosQty(productId: string, delta: number) {
    setPosCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { product: Product; quantity: number }[]
    );
  }

  function removeFromPosCart(productId: string) {
    setPosCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  function handlePosBarcodeKeydown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && posSearch.trim()) {
      e.preventDefault();
      const term = posSearch.trim().toLowerCase();
      const found = products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === term) ||
          (p.sku && p.sku.toLowerCase() === term) ||
          p.name.toLowerCase() === term ||
          p.name.toLowerCase().includes(term)
      );
      if (found) {
        addToPosCart(found);
        setPosSearch('');
        setNotice(`Added "${found.name}" to bill.`);
      }
    }
  }

  const posSubtotal = useMemo(
    () => posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [posCart]
  );
  const posGrandTotal = useMemo(
    () => Math.max(0, posSubtotal - posDiscount),
    [posSubtotal, posDiscount]
  );
  const posChangeReturn = useMemo(() => {
    const cash = Number(posCashTendered) || 0;
    return posPaymentMethod === 'Cash' && cash >= posGrandTotal ? cash - posGrandTotal : 0;
  }, [posCashTendered, posGrandTotal, posPaymentMethod]);

  function completePosOrder() {
    if (!posCart.length) {
      setError('Please add at least one product to the POS register bill.');
      return;
    }
    run(async () => {
      const orderNumber = `POS-${Date.now().toString().slice(-6)}`;
      const newOrderPayload = {
        customer_name: posCustomerName.trim() || 'Counter Customer',
        phone: posCustomerPhone.trim() || '9999999999',
        address: 'Kitchen Counter / In-Store POS',
        requested_date: today(),
        status: 'delivered',
        payment_method: `POS (${posPaymentMethod})`,
        payment_status: 'paid',
        total: posGrandTotal,
        discount: posDiscount,
        invoice_number: orderNumber,
        items: posCart.map((item) => ({
          product_id: item.product.id,
          name: item.product.name,
          weight: item.product.weight,
          price: item.product.price,
          quantity: item.quantity,
        })),
      };

      const res = await supabase!.from('orders').insert(newOrderPayload).select().single();
      if (res.error) throw res.error;

      // Update product inventory stock
      for (const item of posCart) {
        const nextStock = Math.max(0, (item.product.stock ?? 0) - item.quantity);
        await supabase!.from('products').update({ stock: nextStock }).eq('id', item.product.id);
      }

      setPosReceiptOrder(res.data as Order);
      setPosCart([]);
      setPosCashTendered('');
      setPosDiscount(0);
      setPosCustomerName('Counter Customer');
      setPosCustomerPhone('');
      setRevision((n) => n + 1);
    }, 'POS Sale completed and recorded in orders.');
  }

  function saveBanner(e: FormEvent) {
    e.preventDefault();
    if (!bannerEdit) return;
    run(async () => {
      const { id, ...values } = bannerEdit;
      values.title = values.title.trim();
      if (!values.title) throw new Error('Banner title is required.');
      if (!values.image) throw new Error('Banner image is required. Upload an image or enter a URL.');
      const r = id
        ? await supabase!.from('banners').update(values).eq('id', id).select().single()
        : await supabase!.from('banners').insert(values).select().single();
      if (r.error) throw r.error;
      setBannerEdit(null);
    }, 'Banner saved.');
  }

  function toggleBanner(b: Banner) {
    run(async () => {
      const r = await supabase!.from('banners').update({ is_active: !b.is_active }).eq('id', b.id).select().single();
      if (r.error) throw r.error;
    }, 'Banner status updated.');
  }

  function deleteBanner(b: Banner) {
    if (!confirm(`Delete banner "${b.title}"?`)) return;
    run(async () => {
      const r = await supabase!.from('banners').delete().eq('id', b.id);
      if (r.error) throw r.error;
    }, 'Banner deleted.');
  }

  function saveCoupon(e: FormEvent) {
    e.preventDefault();
    if (!couponEdit) return;
    run(async () => {
      const { id, ...values } = couponEdit;
      values.code = values.code.trim().toUpperCase();
      if (!values.code) throw new Error('Coupon code is required.');
      if (values.discount_value <= 0) throw new Error('Discount value must be greater than zero.');
      if (values.discount_type === 'percentage' && values.discount_value > 100) {
        throw new Error('Percentage discount cannot exceed 100%.');
      }
      const r = id
        ? await supabase!.from('coupons').update(values).eq('id', id).select().single()
        : await supabase!.from('coupons').insert(values).select().single();
      if (r.error) throw r.error;
      setCouponEdit(null);
    }, 'Coupon saved.');
  }

  function toggleCoupon(c: Coupon) {
    run(async () => {
      const r = await supabase!.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id).select().single();
      if (r.error) throw r.error;
    }, 'Coupon status updated.');
  }

  function deleteCoupon(c: Coupon) {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    run(async () => {
      const r = await supabase!.from('coupons').delete().eq('id', c.id);
      if (r.error) throw r.error;
    }, 'Coupon deleted.');
  }

  function changeStatus(order: Order, status: string) {
    run(async () => {
      const r = await supabase!.rpc('set_order_status', { p_id: order.id, p_status: status });
      if (r.error) throw r.error;
      setOrderDetail((old) => (old?.id === order.id ? { ...old, status } : old));
    }, 'Order status updated.');
  }

  function saveMember(e: FormEvent) {
    e.preventDefault();
    if (!memberEdit) return;
    run(async () => {
      const r = await supabase!.rpc('save_staff', {
        p_email: memberEdit.email,
        p_name: memberEdit.name,
        p_permissions: memberEdit.permissions,
      });
      if (r.error) throw r.error;
      setMemberEdit(null);
    }, 'Sub-admin access saved.');
  }

  function revokeMember(m: Member) {
    run(async () => {
      const r = await supabase!.rpc('revoke_staff', { p_id: m.user_id });
      if (r.error) throw r.error;
    }, 'Sub-admin access removed.');
  }

  async function invoice(order: Order) {
    setBusy(true);
    setError('');
    try {
      const { downloadInvoice } = await import('@/lib/invoice');
      await downloadInvoice(order);
      setNotice('Invoice PDF downloaded.');
    } catch {
      setError('Could not generate the invoice. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function downloadReport() {
    exportCsv(`swaadha-report-${from}-to-${to}.csv`, [
      ['Swaadha order activity report', 'LIVE DATA'],
      ['Period start', from],
      ['Period end', to],
      ['Order value excludes cancellations; this is not collected revenue.'],
      [],
      ['Date', 'Orders', 'Order value (INR)'],
      ...report.daily.map((d) => [d.day, d.orders, d.value]),
      [],
      ['Status', 'Order count'],
      ...report.by_status.map((s) => [s.status, s.count]),
      [],
      ['Product', 'Units ordered', 'Order value (INR)'],
      ...report.top_products.map((p) => [p.name, p.quantity, p.value]),
    ]);
  }

  async function handleFileUpload(file: File, bucket: 'banners' | 'products', callback: (url: string) => void) {
    setUploadingImage(true);
    setError('');
    try {
      const url = await uploadImage(file, bucket);
      callback(url);
      setNotice(`Image uploaded to '${bucket}' bucket.`);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to upload image to bucket.');
    } finally {
      setUploadingImage(false);
    }
  }

  // =========================================================================
  // 1. DEDICATED CLEAN LOGIN PORTAL (NO SIDEBAR OR DASHBOARD HEADER WHEN LOGGED OUT)
  // =========================================================================
  if (!ready) {
    return (
      <div className="admin-login-wrapper">
        <p className="empty">Checking your kitchen access…</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="admin-login-wrapper">
        <div className="admin-login-container">
          <Link href="/" className="admin-login-brand">
            <img src="/logo.png" alt="Swaadha" />
          </Link>
          <div className="admin-login-box">
            <div className="eyebrow">KITCHEN ADMINISTRATION</div>
            <h1>
              Welcome back.
              <br />
              <em>Your kitchen portal.</em>
            </h1>

            <form onSubmit={login} style={{ marginTop: 24 }}>
              <label>
                Admin email address
                <input
                  required
                  type="email"
                  autoComplete="username"
                  placeholder="admin@swaadha.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              {error && (
                <p className="error" role="alert" style={{ marginBottom: 12 }}>
                  {error}
                </p>
              )}

              <button className="button" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign into Kitchen'}
              </button>
            </form>

            <div className="admin-login-hint">
              <b>🔑 Admin Access</b>
              <p>Sign in with your registered admin credentials to manage products, categories, orders, coupons, and reports.</p>
            </div>

            <Link href="/" className="back-store-link">
              <ArrowLeft size={15} /> Return to storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. DASHBOARD VIEW (ONLY VISIBLE WHEN LOGGED IN)
  // =========================================================================
  const tabInfo = navigation.find((n) => n.id === tab)!;

  return (
    <div className="admin-page admin-expanded">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand">
          <img src="/logo.png" alt="Swaadha" />
        </Link>
        <span>KITCHEN MANAGEMENT</span>
        <div className="admin-navigation">
          {navigation
            .filter((n) => can(n.id))
            .map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={tab === id ? 'current' : ''}
                onClick={() => {
                  setTab(id);
                  setQuery('');
                  setError('');
                  setNotice('');
                }}
              >
                <Icon size={18} />
                {label}
                {tab === id && <ChevronRight size={14} />}
              </button>
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
          <Link href="/" className="back-store">
            <ArrowLeft size={16} /> Visit storefront <ArrowUpRight size={13} />
          </Link>
        </div>
      </aside>

      <div className="admin-main">
        <div className="print-letterhead">
          <img src="/logo.png" alt="Swaadha" />
          <div>
            <h2>Kitchen activity report</h2>
            <p>
              {from} to {to} · India Standard Time
            </p>
          </div>
        </div>

        <div className="admin-top">
          <span>
            SWAADHA / <b>{tabInfo.label.toUpperCase()}</b>
          </span>
          <div>
            {member && (
              <span className="role-pill">
                <ShieldCheck size={12} />
                {member.role}
              </span>
            )}
            <button
              onClick={async () => {
                if (supabase) {
                  await supabase.auth.signOut();
                }
                setMember(null);
                setNotice('');
              }}
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>

        {!can(tab) ? (
          <p className="empty">No tabs are assigned to your account. Ask the owner to grant access.</p>
        ) : (
          <>
            <div className="admin-page-heading">
              <div>
                <div className="eyebrow">
                  {tab === 'dashboard' ? 'A LITTLE OVERVIEW. A LOT OF POSSIBILITIES.' : 'YOUR KITCHEN, BEAUTIFULLY ORGANIZED.'}
                </div>
                <h1>
                  {tab === 'dashboard' ? `Hello, ${member.name.split(' ')[0]}.` : tabInfo.label}
                  <span className="heading-dot">✳</span>
                </h1>
                <p>
                  {(
                    {
                      dashboard: 'Here’s what’s cooking in your business.',
                      pos: 'Quick counter billing, barcode scanning, cash tender & instant receipts.',
                      categories: 'Give every homemade favorite a place to belong.',
                      products: 'Your recipes. Your prices. Your beautiful kitchen menu.',
                      banners: 'Hero carousel and promotional images across your storefront.',
                      coupons: 'Discount codes and promotional offers for your customers.',
                      orders: 'From a little craving to a happy delivery.',
                      reports: 'A clearer picture of your kitchen, ready to download.',
                      team: 'The right tabs for the right people.',
                    } as Record<Tab, string>
                  )[tab]}
                </p>
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

            {/* DASHBOARD & REPORTS */}
            {(tab === 'dashboard' || tab === 'reports') && (
              <>
                <div className="report-toolbar">
                  <div>
                    <CalendarDays size={17} />
                    <label>
                      From
                      <input aria-label="Report start date" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
                    </label>
                    <label>
                      To
                      <input aria-label="Report end date" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
                    </label>
                  </div>
                  {tab === 'reports' && (
                    <div className="report-actions">
                      <button className="button outline" disabled={!from || !to || from > to || loading} onClick={downloadReport}>
                        <Download size={15} /> Download CSV
                      </button>
                      <button className="button outline" onClick={() => window.print()}>
                        Print / Save PDF
                      </button>
                    </div>
                  )}
                </div>

                {!from || !to || from > to ? (
                  <p className="error">Choose a valid start and end date.</p>
                ) : (
                  <>
                    <div className="dashboard-stats">
                      {[
                        { label: 'Order requests', value: String(report.total_orders), icon: ShoppingBag, note: 'Within selected dates' },
                        { label: 'Order value', value: money(report.order_value), icon: BarChart3, note: 'Excludes cancelled orders' },
                        { label: 'Awaiting confirmation', value: String(report.pending), icon: CalendarDays, note: 'Pending orders' },
                        { label: 'Active products', value: String(report.active_products), icon: Package, note: 'Current visible catalog' },
                      ].map(({ label, value, icon: Icon, note }) => (
                        <article key={label}>
                          <div>
                            <span>{label}</span>
                            <Icon size={18} />
                          </div>
                          <strong>{value}</strong>
                          <small>{note}</small>
                        </article>
                      ))}
                    </div>

                    <p className="report-disclaimer">
                      Order value reflects orders, not payments collected. No payment processing is enabled.
                    </p>

                    <div className="analytics-grid">
                      <section className="dashboard-card">
                        <div className="card-heading">
                          <div>
                            <h3>Order activity</h3>
                            <p>Orders placed by day</p>
                          </div>
                          <span>
                            {from} → {to}
                          </span>
                        </div>
                        {report.daily.length ? (
                          <div className="activity-chart">
                            {report.daily.map((d) => (
                              <div key={d.day} title={`${d.day}: ${d.orders} requests, ${money(d.value)}`}>
                                <span>{d.orders}</span>
                                <i style={{ height: `${Math.max(5, (d.orders / Math.max(...report.daily.map((x) => x.orders))) * 130)}px` }} />
                                <small>{d.day.slice(5)}</small>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="empty">Order activity will appear after customers place requests.</p>
                        )}
                      </section>

                      <section className="dashboard-card">
                        <div className="card-heading">
                          <div>
                            <h3>In the kitchen</h3>
                            <p>Orders by status</p>
                          </div>
                        </div>
                        <div className="status-breakdown">
                          {statuses.map((s) => {
                            const count = report.by_status.find((x) => x.status === s)?.count || 0;
                            return (
                              <div key={s}>
                                <span className={`status ${s}`}>{s}</span>
                                <div>
                                  <i style={{ width: `${report.total_orders ? (count / report.total_orders) * 100 : 0}%` }} />
                                </div>
                                <b>{count}</b>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    </div>

                    {tab === 'reports' ? (
                      <>
                        <section className="dashboard-card report-detail">
                          <div className="card-heading">
                            <div>
                              <h3>Daily report</h3>
                              <p>
                                India Standard Time · {from} to {to}
                              </p>
                            </div>
                          </div>
                          <div className="admin-table">
                            <table>
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Order requests</th>
                                  <th>Order value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {report.daily.map((d) => (
                                  <tr key={d.day}>
                                    <td>{d.day}</td>
                                    <td>{d.orders}</td>
                                    <td>{money(d.value)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {!report.daily.length && <p className="empty">No orders in this date range.</p>}
                          </div>
                        </section>

                        <section className="dashboard-card report-detail">
                          <h3>Most ordered products</h3>
                          <div className="admin-table">
                            <table>
                              <thead>
                                <tr>
                                  <th>Product</th>
                                  <th>Units requested</th>
                                  <th>Order value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {report.top_products.map((p) => (
                                  <tr key={p.name}>
                                    <td>{p.name}</td>
                                    <td>{p.quantity}</td>
                                    <td>{money(p.value)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      </>
                    ) : (
                      <div className="dashboard-lower">
                        <section className="dashboard-card">
                          <div className="card-heading">
                            <div>
                              <h3>Kitchen shortcuts</h3>
                              <p>A little less admin. A little more cooking.</p>
                            </div>
                          </div>
                          <div className="quick-actions">
                            {navigation
                              .filter((n) => n.id !== 'dashboard' && can(n.id))
                              .map(({ id, label, icon: Icon }) => (
                                <button
                                  key={id}
                                  onClick={() => {
                                    setTab(id);
                                    setQuery('');
                                  }}
                                >
                                  <Icon size={18} />
                                  <span>{label}</span>
                                  <ArrowUpRight size={15} />
                                </button>
                              ))}
                          </div>
                        </section>
                        <section className="kitchen-note">
                          <span>THE SWAADHA WAY</span>
                          <h3>
                            Small batches.
                            <br />
                            Big possibilities.
                          </h3>
                          <p>Keep your menu fresh, your orders organized, and your team in sync.</p>
                          <Link href="/" className="text-link">
                            See your storefront <ArrowUpRight size={15} />
                          </Link>
                        </section>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* POS BILLING REGISTER TAB */}
            {tab === 'pos' && (
              <div className="pos-layout">
                {/* Left: Product Catalog */}
                <div className="pos-catalog-panel">
                  <div className="pos-toolbar">
                    <div className="pos-scan-input">
                      <Barcode size={18} color="#741e2a" />
                      <input
                        type="text"
                        placeholder="Scan barcode or type name / SKU then hit [Enter]..."
                        value={posSearch}
                        onChange={(e) => setPosSearch(e.target.value)}
                        onKeyDown={handlePosBarcodeKeydown}
                        autoFocus
                      />
                      {posSearch && (
                        <button type="button" onClick={() => setPosSearch('')} style={{ cursor: 'pointer', opacity: 0.5 }}>
                          <X size={15} />
                        </button>
                      )}
                    </div>
                    <div className="pos-category-pills">
                      {['All', ...categories.map((c) => c.name)].map((cName) => (
                        <button
                          key={cName}
                          type="button"
                          className={posCategory === cName ? 'selected' : ''}
                          onClick={() => setPosCategory(cName)}
                        >
                          {cName}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pos-grid">
                    {products
                      .filter(
                        (p) =>
                          p.available &&
                          (posCategory === 'All' || p.category === posCategory) &&
                          (!posSearch ||
                            `${p.name} ${p.category} ${p.sku || ''} ${p.barcode || ''}`
                              .toLowerCase()
                              .includes(posSearch.toLowerCase()))
                      )
                      .map((p) => {
                        const inCart = posCart.find((i) => i.product.id === p.id);
                        return (
                          <div
                            key={p.id}
                            className="pos-card"
                            onClick={() => addToPosCart(p)}
                            title={`Click to add ${p.name} to bill`}
                          >
                            <img src={p.image} alt={p.name} className="pos-card-img" />
                            <h4>{p.name}</h4>
                            <div className="pos-card-meta">
                              {p.weight} · <span style={{ color: (p.stock ?? 0) <= 5 ? '#c2410c' : '#15803d' }}>
                                {p.stock ?? 0} in stock
                              </span>
                            </div>
                            <div className="pos-card-footer">
                              <span className="pos-card-price">{money(p.price)}</span>
                              <span className="pos-card-add-btn">
                                {inCart ? `+ Add (${inCart.quantity})` : '+ Add'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Right: Current Register Bill */}
                <div className="pos-bill-panel">
                  <div className="pos-bill-header">
                    <div>
                      <h3>Current Register Bill</h3>
                      <small style={{ color: '#88746c' }}>Counter 01 · {today()}</small>
                    </div>
                    {posCart.length > 0 && (
                      <button
                        type="button"
                        className="table-action"
                        style={{ color: '#b91c1c' }}
                        onClick={() => setPosCart([])}
                      >
                        <Trash2 size={13} /> Clear
                      </button>
                    )}
                  </div>

                  <div className="pos-customer-row">
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={posCustomerName}
                      onChange={(e) => setPosCustomerName(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Mobile No. (optional)"
                      value={posCustomerPhone}
                      onChange={(e) => setPosCustomerPhone(e.target.value)}
                    />
                  </div>

                  <div className="pos-items-scroll">
                    {!posCart.length ? (
                      <p style={{ textAlign: 'center', color: '#9c8880', padding: '30px 10px', fontSize: 12 }}>
                        No items in bill yet.<br />Click products on the left or scan barcode.
                      </p>
                    ) : (
                      posCart.map(({ product: p, quantity }) => (
                        <div key={p.id} className="pos-bill-item">
                          <div className="pos-item-info">
                            <span className="pos-item-name">{p.name}</span>
                            <span className="pos-item-rate">{money(p.price)} / {p.weight}</span>
                          </div>
                          <div className="pos-item-qty">
                            <button type="button" onClick={() => updatePosQty(p.id, -1)}>-</button>
                            <span style={{ minWidth: 16, textAlign: 'center', fontWeight: 600 }}>{quantity}</span>
                            <button type="button" onClick={() => updatePosQty(p.id, 1)}>+</button>
                          </div>
                          <span className="pos-item-total">{money(p.price * quantity)}</span>
                          <button
                            type="button"
                            className="pos-item-del"
                            onClick={() => removeFromPosCart(p.id)}
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pos-totals-row">
                    <span>Subtotal</span>
                    <b>{money(posSubtotal)}</b>
                  </div>

                  <div className="pos-totals-row" style={{ alignItems: 'center' }}>
                    <span>Discount (₹)</span>
                    <input
                      type="number"
                      min="0"
                      max={posSubtotal}
                      value={posDiscount || ''}
                      placeholder="0"
                      onChange={(e) => setPosDiscount(Math.max(0, Number(e.target.value) || 0))}
                      style={{ width: 80, padding: '3px 8px', border: '1px solid #d9ccbe', borderRadius: 4, textAlign: 'right', fontSize: 11 }}
                    />
                  </div>

                  <div className="pos-grand-total">
                    <span>Total Payable</span>
                    <strong>{money(posGrandTotal)}</strong>
                  </div>

                  {/* Payment Method Selection */}
                  <div style={{ marginTop: 14 }}>
                    <small style={{ fontSize: 10, fontWeight: 700, color: '#7a665e', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      Payment Method
                    </small>
                    <div className="pos-payment-selector">
                      {(['Cash', 'UPI', 'Card', 'Pay Later'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          className={posPaymentMethod === mode ? 'selected' : ''}
                          onClick={() => setPosPaymentMethod(mode)}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash Change Calculator */}
                  {posPaymentMethod === 'Cash' && (
                    <div className="pos-cash-calculator">
                      <div className="pos-cash-tender-row">
                        <label style={{ fontSize: 11, color: '#4d5b36' }}>Cash Received (₹):</label>
                        <input
                          type="number"
                          placeholder={String(posGrandTotal)}
                          value={posCashTendered}
                          onChange={(e) => setPosCashTendered(e.target.value)}
                        />
                      </div>
                      <div className="pos-quick-cash">
                        {[posGrandTotal, 100, 200, 500, 1000, 2000]
                          .filter((v, i, a) => v >= posGrandTotal && a.indexOf(v) === i)
                          .slice(0, 4)
                          .map((val) => (
                            <button key={val} type="button" onClick={() => setPosCashTendered(String(val))}>
                              ₹{val}
                            </button>
                          ))}
                      </div>
                      <div className="pos-change-box">
                        <span>Change to Return:</span>
                        <span>{money(posChangeReturn)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="pos-checkout-btn"
                    disabled={busy || !posCart.length}
                    onClick={completePosOrder}
                  >
                    <Receipt size={17} /> Complete Sale & Print Bill ({money(posGrandTotal)})
                  </button>
                </div>
              </div>
            )}

            {/* PRODUCTS TAB */}
            {tab === 'products' && (
              <>
                <div className="listing-toolbar">
                  <span>{products.length} products in your kitchen</span>
                  <label className="search">
                    <Search size={16} />
                    <input
                      aria-label="Search products"
                      placeholder="Search name, category, SKU, or barcode"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                <div className="admin-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Barcode</th>
                        <th>Visibility</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchedProducts.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div className="table-product">
                              <img src={p.image} alt="" />
                              <div>
                                <b>{p.name}</b>
                                <small>{p.weight}</small>
                              </div>
                            </div>
                          </td>
                          <td>{p.category}</td>
                          <td>{money(p.price)}</td>
                          <td>
                            <span className={`stock-indicator ${(p.stock ?? 0) < 5 ? 'low' : ''}`}>{p.stock ?? 0} packs</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="barcode-pill"
                              title="Click to preview & print barcode label"
                              onClick={() => setBarcodeModalProduct(p)}
                            >
                              <Barcode size={12} />
                              {p.barcode || p.sku || `SW-${p.id.slice(0, 6).toUpperCase()}`}
                            </button>
                          </td>
                          <td>
                            <button
                              disabled={busy}
                              className={`status ${p.available ? 'available' : ''}`}
                              onClick={() => toggleProduct(p)}
                            >
                              {p.available ? 'Available' : 'Hidden'}
                            </button>
                          </td>
                          <td>
                            <div className="order-list-actions">
                              <button
                                className="table-action"
                                title="Print Barcode Label"
                                onClick={() => setBarcodeModalProduct(p)}
                              >
                                <Barcode size={14} /> Barcode
                              </button>
                              <button className="table-action" aria-label={`Edit ${p.name}`} onClick={() => openProduct(p)}>
                                <Pencil size={15} /> Edit
                              </button>
                              <button className="table-action" aria-label={`Delete ${p.name}`} onClick={() => deleteProduct(p)}>
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!matchedProducts.length && <p className="empty">No products found. Add a favorite to get started.</p>}
                </div>
                <p className="table-help">Hide products to remove them from the storefront. Products in hidden categories are also hidden.</p>
              </>
            )}

            {/* CATEGORIES TAB */}
            {tab === 'categories' && (
              <div className="category-management-grid">
                {categories.map((c) => {
                  const catImage = getCategoryImage(c);
                  return (
                    <article key={c.id} className="dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <img
                          src={catImage}
                          alt={c.name}
                          className="category-img-thumb"
                          style={{ width: 68, height: 68, borderRadius: 12, objectFit: 'cover' }}
                        />
                        <span className={`status ${c.enabled ? 'available' : ''}`}>{c.enabled ? 'Visible' : 'Hidden'}</span>
                      </div>
                      <h3 style={{ marginBottom: 4 }}>{c.name}</h3>
                      <p style={{ minHeight: 40, fontSize: 11 }}>{c.description || 'A home for your next homemade favorite.'}</p>
                      <div className="category-card-bottom" style={{ marginTop: 'auto', paddingTop: 10 }}>
                        <span>{can('products') ? `${products.filter((p) => p.category === c.name).length} products` : 'Kitchen category'}</span>
                        <button className="table-action" onClick={() => setCategoryEdit(c)}>
                          <Pencil size={14} /> Edit category
                        </button>
                      </div>
                    </article>
                  );
                })}
                {!categories.length && <p className="empty">Add your first category to organize the menu.</p>}
              </div>
            )}

            {/* BANNERS TAB */}
            {tab === 'banners' && (
              <>
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
            )}

            {/* COUPONS TAB */}
            {tab === 'coupons' && (
              <>
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
            )}

            {/* ORDERS TAB */}
            {tab === 'orders' && (
              <>
                <div className="listing-toolbar">
                  <div>
                    <label className="search">
                      <Search size={16} />
                      <input
                        aria-label="Search orders"
                        placeholder="Search order or customer"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                  </div>
                  <select aria-label="Filter order status" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
                    <option value="all">All statuses</option>
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Order / customer</th>
                        <th>Requested date</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchedOrders.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <b>#{o.id.slice(0, 10).toUpperCase()}</b>
                            <small>{o.customer_name}</small>
                            {o.coupon_code && <small style={{ color: 'var(--red)' }}> · Coupon: {o.coupon_code}</small>}
                          </td>
                          <td>{o.requested_date}</td>
                          <td>{money(o.total)}</td>
                          <td>
                            <select
                              className="order-status-select"
                              aria-label={`Status for ${o.id}`}
                              value={o.status}
                              disabled={busy}
                              onChange={(e) => changeStatus(o, e.target.value)}
                            >
                              {statuses.map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <div className="order-list-actions">
                              <button className="table-action" onClick={() => setOrderDetail(o)}>
                                View <ArrowUpRight size={15} />
                              </button>
                              <button className="table-action" disabled={busy} aria-label={`Download invoice for ${o.id}`} onClick={() => invoice(o)}>
                                <Download size={14} /> Invoice
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!matchedOrders.length && <p className="empty">No matching orders.</p>}
                </div>
                <p className="table-help">Orders placed at checkout appear here. WhatsApp messages do not automatically create an order record.</p>
              </>
            )}

            {/* TEAM TAB */}
            {tab === 'team' && (
              <>
                <div className="access-explainer">
                  <ShieldCheck size={22} />
                  <div>
                    <b>Owner-controlled access</b>
                    <p>
                      Sub-admins see only their assigned tabs. Create an account on the customer login page first, then grant access using that
                      email. Only owners can manage this page.
                    </p>
                  </div>
                </div>
                <div className="admin-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Team member</th>
                        <th>Role</th>
                        <th>Tab access</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.user_id}>
                          <td>
                            <b>{m.name}</b>
                            <small>{m.email || 'Owner account'}</small>
                          </td>
                          <td>
                            <span className="status available">{m.role === 'owner' ? 'Owner' : 'Sub-admin'}</span>
                          </td>
                          <td>
                            <div className="permission-pills">
                              {m.role === 'owner' ? (
                                <span>All tabs</span>
                              ) : m.permissions.length ? (
                                m.permissions.map((p) => <span key={p}>{navigation.find((n) => n.id === p)?.label || p}</span>)
                              ) : (
                                <span>No tabs assigned</span>
                              )}
                            </div>
                          </td>
                          <td>
                            {m.role === 'staff' ? (
                              <div className="team-actions">
                                <button aria-label={`Edit access for ${m.name}`} onClick={() => setMemberEdit(m)}>
                                  <Pencil size={16} />
                                </button>
                                <button aria-label={`Revoke access for ${m.name}`} disabled={busy} onClick={() => revokeMember(m)}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ) : (
                              <small>Protected owner</small>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* MODAL: PRODUCT EDIT/ADD */}
        {productEdit && (
          <Modal title={productEdit.id ? 'Edit product' : 'Add a favorite'} onClose={() => setProductEdit(null)}>
            <form onSubmit={saveProduct}>
              <div className="form-row">
                <label>
                  Product name
                  <input
                    required
                    maxLength={120}
                    value={productEdit.name}
                    onChange={(e) => setProductEdit({ ...productEdit, name: e.target.value })}
                  />
                </label>
                <label>
                  Category
                  <select
                    value={productEdit.category}
                    onChange={(e) => setProductEdit({ ...productEdit, category: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label>
                  Price (₹)
                  <input
                    required
                    type="number"
                    min={0}
                    step="0.01"
                    value={productEdit.price || ''}
                    onChange={(e) => setProductEdit({ ...productEdit, price: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Weight / pack
                  <input
                    required
                    placeholder="e.g. 250 g"
                    value={productEdit.weight}
                    onChange={(e) => setProductEdit({ ...productEdit, weight: e.target.value })}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Available stock (packs)
                  <input
                    required
                    type="number"
                    min={0}
                    step={1}
                    value={productEdit.stock ?? 0}
                    onChange={(e) => setProductEdit({ ...productEdit, stock: Number(e.target.value) })}
                  />
                </label>
                <label>
                  SKU (Item code)
                  <input
                    maxLength={50}
                    placeholder="e.g. SW-MANGO-250"
                    value={productEdit.sku ?? ''}
                    onChange={(e) => setProductEdit({ ...productEdit, sku: e.target.value })}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Barcode / Barcode Value
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      maxLength={50}
                      placeholder="e.g. SW100482"
                      value={productEdit.barcode ?? ''}
                      onChange={(e) => setProductEdit({ ...productEdit, barcode: e.target.value })}
                    />
                    <button
                      type="button"
                      className="button outline"
                      style={{ padding: '0 12px', fontSize: 11, whiteSpace: 'nowrap', borderRadius: 6 }}
                      title="Generate unique barcode"
                      onClick={() =>
                        setProductEdit({
                          ...productEdit,
                          barcode: generateBarcodeValue(productEdit.sku || productEdit.name),
                        })
                      }
                    >
                      <Barcode size={14} /> Auto
                    </button>
                  </div>
                </label>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
                  <small style={{ color: '#88746c', fontSize: 11 }}>
                    Scannable at POS counter using barcode readers.
                  </small>
                </div>
              </div>
              <label>
                Short description
                <textarea
                  required
                  maxLength={1000}
                  value={productEdit.description}
                  onChange={(e) => setProductEdit({ ...productEdit, description: e.target.value })}
                />
              </label>

              {/* Product Image URL + Direct Storage Upload */}
              <label>
                Image URL
                <input
                  required
                  type="text"
                  placeholder="https://… or upload below"
                  value={productEdit.image}
                  onChange={(e) => setProductEdit({ ...productEdit, image: e.target.value })}
                />
              </label>
              <div className="storage-uploader-box">
                <label className="upload-btn-label">
                  <Upload size={14} /> {uploadingImage ? 'Uploading to Supabase…' : 'Upload photo to products bucket'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, 'products', (url) => setProductEdit((prev) => (prev ? { ...prev, image: url } : null)));
                    }}
                  />
                </label>
                {productEdit.image && (
                  <img src={productEdit.image} alt="Preview" style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 4 }} />
                )}
              </div>

              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={productEdit.available}
                  onChange={(e) => setProductEdit({ ...productEdit, available: e.target.checked })}
                />{' '}
                Show on the storefront
              </label>

              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button className="button modal-save" disabled={busy || uploadingImage}>
                <Check size={17} /> Save product
              </button>
            </form>
          </Modal>
        )}

        {/* MODAL: CATEGORY EDIT/ADD */}
        {categoryEdit && (
          <Modal title={categoryEdit.id ? 'Edit category' : 'Add a category'} onClose={() => setCategoryEdit(null)}>
            <form onSubmit={saveCategory}>
              <label>
                Category name
                <input
                  required
                  maxLength={80}
                  value={categoryEdit.name}
                  onChange={(e) => setCategoryEdit({ ...categoryEdit, name: e.target.value })}
                />
              </label>
              <label>
                Category image URL (Visible on storefront & menu cards)
                <input
                  type="text"
                  placeholder="/images/pickle.webp or upload below"
                  value={categoryEdit.image || ''}
                  onChange={(e) => setCategoryEdit({ ...categoryEdit, image: e.target.value })}
                />
              </label>
              <div className="storage-uploader-box">
                <label className="upload-btn-label">
                  <Upload size={14} /> {uploadingImage ? 'Uploading…' : 'Upload category image to bucket'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, 'products', (url) => setCategoryEdit((prev) => (prev ? { ...prev, image: url } : null)));
                    }}
                  />
                </label>
                {(categoryEdit.image || getCategoryImage(categoryEdit)) && (
                  <img
                    src={categoryEdit.image || getCategoryImage(categoryEdit)}
                    alt="Category preview"
                    style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }}
                  />
                )}
              </div>
              <label>
                Description
                <textarea
                  maxLength={500}
                  value={categoryEdit.description}
                  onChange={(e) => setCategoryEdit({ ...categoryEdit, description: e.target.value })}
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={categoryEdit.enabled}
                  onChange={(e) => setCategoryEdit({ ...categoryEdit, enabled: e.target.checked })}
                />{' '}
                Visible on storefront
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="button modal-save" disabled={busy}>
                <Check size={16} /> Save category
              </button>
            </form>
          </Modal>
        )}

        {/* MODAL: BANNER EDIT/ADD */}
        {bannerEdit && (
          <Modal title={bannerEdit.id ? 'Edit hero banner' : 'Add hero banner'} onClose={() => setBannerEdit(null)}>
            <form onSubmit={saveBanner}>
              <div className="form-row">
                <label>
                  Tag / Kicker
                  <input
                    required
                    maxLength={100}
                    placeholder="e.g. THE CELEBRATION COLLECTION"
                    value={bannerEdit.tag}
                    onChange={(e) => setBannerEdit({ ...bannerEdit, tag: e.target.value })}
                  />
                </label>
                <label>
                  Display order
                  <input
                    required
                    type="number"
                    min={1}
                    value={bannerEdit.display_order}
                    onChange={(e) => setBannerEdit({ ...bannerEdit, display_order: Number(e.target.value) })}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Main title
                  <input
                    required
                    maxLength={100}
                    placeholder="e.g. Little sweets,"
                    value={bannerEdit.title}
                    onChange={(e) => setBannerEdit({ ...bannerEdit, title: e.target.value })}
                  />
                </label>
                <label>
                  Highlight text (italic)
                  <input
                    maxLength={100}
                    placeholder="e.g. lasting memories."
                    value={bannerEdit.em}
                    onChange={(e) => setBannerEdit({ ...bannerEdit, em: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Description
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Short tagline shown over the banner"
                  value={bannerEdit.text}
                  onChange={(e) => setBannerEdit({ ...bannerEdit, text: e.target.value })}
                />
              </label>
              <div className="form-row">
                <label>
                  Thumbnail label
                  <input
                    maxLength={50}
                    placeholder="e.g. Sweet celebrations"
                    value={bannerEdit.label}
                    onChange={(e) => setBannerEdit({ ...bannerEdit, label: e.target.value })}
                  />
                </label>
                <label>
                  Button Link (href)
                  <input
                    maxLength={200}
                    placeholder="/products?category=Sweets"
                    value={bannerEdit.href}
                    onChange={(e) => setBannerEdit({ ...bannerEdit, href: e.target.value })}
                  />
                </label>
              </div>

              {/* Banner Image URL + Upload */}
              <label>
                Banner image URL
                <input
                  required
                  type="text"
                  placeholder="https://… or upload below"
                  value={bannerEdit.image}
                  onChange={(e) => setBannerEdit({ ...bannerEdit, image: e.target.value })}
                />
              </label>
              <div className="storage-uploader-box">
                <label className="upload-btn-label">
                  <Upload size={14} /> {uploadingImage ? 'Uploading to Supabase…' : 'Upload image to banners bucket'}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, 'banners', (url) => setBannerEdit((prev) => (prev ? { ...prev, image: url } : null)));
                    }}
                  />
                </label>
                {bannerEdit.image && (
                  <img src={bannerEdit.image} alt="Preview" style={{ width: 68, height: 42, objectFit: 'cover', borderRadius: 4 }} />
                )}
              </div>

              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={bannerEdit.is_active}
                  onChange={(e) => setBannerEdit({ ...bannerEdit, is_active: e.target.checked })}
                />{' '}
                Active (display on storefront)
              </label>

              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="button modal-save" disabled={busy || uploadingImage}>
                <Check size={16} /> Save banner
              </button>
            </form>
          </Modal>
        )}

        {/* MODAL: COUPON EDIT/ADD */}
        {couponEdit && (
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
        )}

        {/* MODAL: SUB-ADMIN / TEAM EDIT */}
        {memberEdit && (
          <Modal title={memberEdit.user_id ? 'Edit tab access' : 'Add a sub-admin'} onClose={() => setMemberEdit(null)}>
            <form onSubmit={saveMember}>
              <label>
                Name
                <input
                  required
                  maxLength={100}
                  value={memberEdit.name}
                  onChange={(e) => setMemberEdit({ ...memberEdit, name: e.target.value })}
                />
              </label>
              <label>
                Account email
                <input
                  required
                  type="email"
                  readOnly={!!memberEdit.user_id}
                  value={memberEdit.email}
                  onChange={(e) => setMemberEdit({ ...memberEdit, email: e.target.value })}
                />
              </label>
              <p className="table-help">Use an existing customer account email. This grants admin tabs; it does not send an invitation or create a password.</p>
              <div className="permission-selector">
                <b>Allow access to</b>
                {navigation
                  .filter((n) => n.id !== 'team')
                  .map(({ id, label, icon: Icon }) => (
                    <label className="checkbox" key={id}>
                      <input
                        type="checkbox"
                        checked={memberEdit.permissions.includes(id)}
                        onChange={(e) =>
                          setMemberEdit({
                            ...memberEdit,
                            permissions: e.target.checked
                              ? [...memberEdit.permissions, id]
                              : memberEdit.permissions.filter((p) => p !== id),
                          })
                        }
                      />
                      <Icon size={16} />
                      {label}
                    </label>
                  ))}
              </div>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="button modal-save" disabled={busy}>
                <ShieldCheck size={17} /> Save tab access
              </button>
            </form>
          </Modal>
        )}

        {/* MODAL: ORDER DETAIL */}
        {orderDetail && (
          <Modal title={`Order #${orderDetail.id.slice(0, 10).toUpperCase()}`} onClose={() => setOrderDetail(null)}>
            <div className="order-detail">
              <span className={`status ${orderDetail.status}`}>{orderDetail.status}</span>
              <h3>{orderDetail.customer_name}</h3>
              <p>
                {orderDetail.phone}
                <br />
                {[orderDetail.address, orderDetail.city, orderDetail.state, orderDetail.pincode].filter(Boolean).join(', ')}
              </p>
              <p>
                Requested date: <b>{orderDetail.requested_date}</b>
              </p>
              {orderDetail.items.map((item, i) => (
                <div className="order-line" key={i}>
                  <span>
                    {item.name}
                    <small>
                      {item.weight} × {item.quantity}
                    </small>
                  </span>
                  <b>{money(item.price * item.quantity)}</b>
                </div>
              ))}
              {orderDetail.coupon_code && (
                <div className="order-line" style={{ color: 'var(--red)' }}>
                  <span>Coupon applied ({orderDetail.coupon_code})</span>
                  <b>- {money(orderDetail.discount || 0)}</b>
                </div>
              )}
              <div className="order-total">
                <span>Order value</span>
                <strong>{money(orderDetail.total)}</strong>
              </div>
              <p className="table-help">
                Payment: {orderDetail.payment_method || 'COD'} · {orderDetail.payment_status || 'unpaid'}.
              </p>
              <button className="button outline" disabled={busy} onClick={() => invoice(orderDetail)}>
                <Download size={16} /> Download invoice PDF
              </button>
              <ShippingPanel key={orderDetail.id} order={orderDetail} onChanged={() => setRevision((n) => n + 1)} />
            </div>
          </Modal>
        )}

        {/* MODAL: PRODUCT BARCODE PREVIEW & PRINT LABEL */}
        {barcodeModalProduct && (
          <BarcodeModal
            product={barcodeModalProduct}
            onClose={() => setBarcodeModalProduct(null)}
          />
        )}

        {/* MODAL: POS THERMAL RECEIPT BILL */}
        {posReceiptOrder && (
          <Modal title="Kitchen POS Bill / Receipt" onClose={() => setPosReceiptOrder(null)}>
            <div className="pos-receipt-container" style={{ padding: '10px 0', textAlign: 'center' }}>
              <div
                id="thermal-receipt-slip"
                style={{
                  background: '#fff',
                  border: '1px dashed #d6bfa3',
                  borderRadius: 8,
                  padding: '24px 20px',
                  maxWidth: 380,
                  margin: '0 auto',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  textAlign: 'left',
                  color: '#1a1a1a',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <h2 style={{ margin: '0 0 4px', fontSize: 20, fontFamily: 'serif', color: '#741e2a' }}>
                    SWAADHA KITCHEN
                  </h2>
                  <p style={{ margin: 0, fontSize: 10, color: '#666' }}>Taste that feels like home.</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: '#666' }}>+91 8296295658 · Bangalore</p>
                </div>

                <div style={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '8px 0', margin: '8px 0', fontSize: 11 }}>
                  <div><b>Bill No:</b> {posReceiptOrder.invoice_number || `#${posReceiptOrder.id.slice(0, 8).toUpperCase()}`}</div>
                  <div><b>Date:</b> {new Date(posReceiptOrder.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                  <div><b>Customer:</b> {posReceiptOrder.customer_name}</div>
                  {posReceiptOrder.phone && <div><b>Phone:</b> {posReceiptOrder.phone}</div>}
                  <div><b>Payment:</b> {posReceiptOrder.payment_method} · PAID</div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, margin: '10px 0' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #111' }}>
                      <th style={{ textAlign: 'left', paddingBottom: 4 }}>Item</th>
                      <th style={{ textAlign: 'center', paddingBottom: 4 }}>Qty</th>
                      <th style={{ textAlign: 'right', paddingBottom: 4 }}>Rate</th>
                      <th style={{ textAlign: 'right', paddingBottom: 4 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posReceiptOrder.items.map((it, i) => (
                      <tr key={i} style={{ borderBottom: '1px dotted #e5e5e5' }}>
                        <td style={{ padding: '4px 0' }}>{it.name} <span style={{ fontSize: 9, color: '#666' }}>({it.weight})</span></td>
                        <td style={{ textAlign: 'center', padding: '4px 0' }}>{it.quantity}</td>
                        <td style={{ textAlign: 'right', padding: '4px 0' }}>{it.price}</td>
                        <td style={{ textAlign: 'right', padding: '4px 0' }}>{it.price * it.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ borderTop: '1px dashed #ccc', paddingTop: 8, fontSize: 12 }}>
                  {(posReceiptOrder.discount ?? 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#741e2a' }}>
                      <span>Discount:</span>
                      <span>- {money(posReceiptOrder.discount ?? 0)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 'bold', margin: '6px 0' }}>
                    <span>TOTAL:</span>
                    <span>{money(posReceiptOrder.total)}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px dashed #ccc' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, color: '#555' }}>Thank you for visiting Swaadha!</p>
                  <p style={{ margin: 0, fontSize: 9, color: '#888' }}>Fresh homemade goodness</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    const slip = document.getElementById('thermal-receipt-slip');
                    if (!slip) return;
                    const w = window.open('', '_blank', 'width=450,height=600');
                    if (!w) return;
                    w.document.write(`
                      <html>
                      <head>
                        <title>Receipt - ${posReceiptOrder.invoice_number}</title>
                        <style>
                          @page { size: 80mm auto; margin: 4mm; }
                          body { font-family: monospace; margin: 0; padding: 10px; }
                        </style>
                      </head>
                      <body>
                        ${slip.innerHTML}
                        <script>window.onload = function() { window.print(); window.close(); }</script>
                      </body>
                      </html>
                    `);
                    w.document.close();
                  }}
                >
                  <Printer size={16} /> Print Thermal Slip
                </button>
                <button
                  type="button"
                  className="button outline"
                  onClick={() => setPosReceiptOrder(null)}
                >
                  Done / Next Customer
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

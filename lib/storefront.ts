import { Product, withDetails } from './products';
import { Category, Banner, Coupon, evaluateCoupon } from './admin';
import { supabase } from './supabase';

export async function loadMenu(): Promise<{ products: Product[]; categories: Category[] }> {
  if (!supabase) {
    return { products: [], categories: [] };
  }
  const [menu, categories] = await Promise.all([
    supabase.from('products').select('*').eq('available', true).order('created_at', { ascending: false }),
    supabase.from('categories').select('*').eq('enabled', true).order('name', { ascending: true }),
  ]);
  if (menu.error || categories.error) {
    throw new Error('Could not load the kitchen menu from the database.');
  }
  return { products: (menu.data ?? []).map(withDetails), categories: categories.data ?? [] };
}

export async function loadBanners(): Promise<Banner[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error || !data) {
    return [];
  }
  return data;
}

export async function validateCouponCode(
  code: string,
  total: number
): Promise<{ valid: boolean; discount_amount: number; message: string; coupon?: Coupon }> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { valid: false, discount_amount: 0, message: 'Please enter a coupon code.' };
  if (!supabase) return { valid: false, discount_amount: 0, message: 'Database is not connected.' };

  // Try RPC first for server-side validation
  try {
    const { data, error } = await supabase.rpc('validate_coupon', { p_code: clean, p_cart_total: total });
    if (!error && data) {
      return {
        valid: Boolean(data.valid),
        discount_amount: Number(data.discount_amount || 0),
        message: String(data.message || (data.valid ? 'Coupon applied!' : 'Invalid coupon.')),
      };
    }
  } catch {}

  // Fallback direct table query
  const { data, error } = await supabase.from('coupons').select('*').ilike('code', clean).eq('is_active', true).maybeSingle();
  if (error || !data) {
    return { valid: false, discount_amount: 0, message: 'Coupon code not found or inactive.' };
  }
  const res = evaluateCoupon(data, total);
  return { valid: res.valid, discount_amount: res.discount, message: res.message, coupon: data };
}

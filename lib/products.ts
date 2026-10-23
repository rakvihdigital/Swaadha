export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  weight: string;
  image: string;
  available: boolean;
  stock?: number;
  sku?: string;
  barcode?: string;
  long_description?: string;
  ingredients?: string;
  allergens?: string;
  shelf_life?: string;
  storage?: string;
  net_weight_grams?: number;
};

export const whatsapp = (text: string) => `https://wa.me/918296295658?text=${encodeURIComponent(text)}`;

export function withDetails(p: Product): Product {
  return {
    stock: p.stock ?? 0,
    sku: p.sku ?? '',
    barcode: p.barcode ?? '',
    long_description: p.long_description ?? '',
    ingredients: p.ingredients ?? '',
    allergens: p.allergens ?? '',
    shelf_life: p.shelf_life ?? '',
    storage: p.storage ?? '',
    net_weight_grams: p.net_weight_grams ?? 250,
    ...p,
  };
}

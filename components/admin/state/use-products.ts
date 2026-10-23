'use client';
import { FormEvent, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, withDetails } from '@/lib/products';
import { generateBarcodeValue, productBarcode } from '../barcode';
import type { Draft } from '../config';
import type { AdminData } from './use-admin-data';

/** Adding, editing, hiding and deleting products, plus the barcode label popup. */
export function useProducts({ products, run }: AdminData) {
  const [productEdit, setProductEdit] = useState<Draft<Product> | null>(null);
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);
  // Stock when the editor opened, so a save can't overwrite a sale made meanwhile.
  const originalStock = useRef<number | null>(null);

  function openProduct(product: Product) {
    originalStock.current = product.stock ?? 0;
    setProductEdit(withDetails(product));
  }

  function saveProduct(e: FormEvent) {
    e.preventDefault();
    if (!productEdit) return;
    run(async () => {
      const { id, ...values } = productEdit;
      if (!Number.isFinite(values.price) || values.price < 0) throw new Error('Enter a valid price.');
      if (!Number.isInteger(values.stock) || Number(values.stock) < 0) throw new Error('Stock must be a whole number of packs, zero or higher.');
      if (!values.barcode || !values.barcode.trim()) {
        values.barcode = generateBarcodeValue(values.sku, products.filter((p) => p.id !== id).map(productBarcode));
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

  return {
    productEdit,
    setProductEdit,
    openProduct,
    saveProduct,
    toggleProduct,
    deleteProduct,
    barcodeModalProduct,
    setBarcodeModalProduct,
  };
}

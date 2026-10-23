'use client';
import { BarcodeModal } from '../barcode';
import { useAdmin } from '../context';

/** Preview and print a product barcode label. */
export function BarcodeDialog() {
  const { barcodeModalProduct, setBarcodeModalProduct } = useAdmin();
  if (!barcodeModalProduct) return null;

  return (
    <BarcodeModal
      product={barcodeModalProduct}
      onClose={() => setBarcodeModalProduct(null)}
    />
  );
}

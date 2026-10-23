'use client';
import { ProductDialog } from './product-dialog';
import { CategoryDialog } from './category-dialog';
import { BannerDialog } from './banner-dialog';
import { CouponDialog } from './coupon-dialog';
import { MemberDialog } from './member-dialog';
import { OrderDialog } from './order-dialog';
import { BarcodeDialog } from './barcode-dialog';
import { ReceiptDialog } from './receipt-dialog';

/** Every admin popup. Each one renders only while it is open. */
export function AdminDialogs() {
  return (
    <>
      <ProductDialog />
      <CategoryDialog />
      <BannerDialog />
      <CouponDialog />
      <MemberDialog />
      <OrderDialog />
      <BarcodeDialog />
      <ReceiptDialog />
    </>
  );
}

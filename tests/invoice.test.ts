import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { invoiceBytes } from '../lib/invoice';
import type { Order } from '../lib/admin';

test('Invoice PDF supports a normal order and paginates long carts', async () => {
  const order: Order = {
    id: 'test-order-1',
    customer_id: null,
    customer_name: 'Ananya Sharma',
    phone: '9876543210',
    address: '12, Temple Road, Malleshwaram',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560003',
    requested_date: '2026-10-30',
    status: 'pending',
    total: 360,
    items: [
      { product_id: 'prod-1', name: 'Mango Pickle', weight: '250 g', price: 180, quantity: 2 },
    ],
    created_at: '2026-10-20T10:00:00.000Z',
  };

  const short = await PDFDocument.load(await invoiceBytes(order));
  assert.equal(short.getPageCount(), 1);
  const long = {
    ...order,
    items: Array.from({ length: 30 }, (_, i) => ({
      ...order.items[0],
      name: `Traditional favorite ${i} with a carefully prepared family recipe`,
      quantity: 2,
    })),
    total: 10800,
  };
  const document = await PDFDocument.load(await invoiceBytes(long));
  assert.ok(document.getPageCount() > 1);
  for (const p of document.getPages()) assert.equal(Math.round(p.getHeight()), 842);
});

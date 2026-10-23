import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMetrics, Order, serializeCsv } from '../lib/admin';
import type { Product } from '../lib/products';

const testProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Mango Pickle',
    category: 'Pickles',
    description: 'Fresh homestyle mango pickle',
    price: 180,
    weight: '250 g',
    image: '/images/pickle.webp',
    available: true,
  },
  {
    id: 'prod-2',
    name: 'Chakkuli',
    category: 'Snacks',
    description: 'Crisp savory snack',
    price: 160,
    weight: '200 g',
    image: '/images/products/chakli.jpg',
    available: true,
  },
];

const order = (overrides: Partial<Order>): Order => ({
  id: '1',
  customer_id: null,
  customer_name: 'Test',
  phone: '1234567890',
  address: 'Test address',
  requested_date: '2026-10-30',
  status: 'pending',
  total: 180,
  items: [{ product_id: 'prod-1', name: 'Mango Pickle', weight: '250 g', price: 180, quantity: 1 }],
  created_at: '2026-10-16T20:00:00.000Z',
  ...overrides,
});

test('Reports use order creation dates in India, not dispatch dates or UTC days', () => {
  const report = calculateMetrics([order({})], testProducts, '2026-10-17', '2026-10-17');
  assert.equal(report.total_orders, 1);
  assert.equal(report.daily[0].day, '2026-10-17');
  assert.equal(calculateMetrics([order({})], testProducts, '2026-10-16', '2026-10-16').total_orders, 0);
});

test('Cancelled requests remain in counts but are excluded from value and product totals', () => {
  const report = calculateMetrics(
    [
      order({}),
      order({ id: '2', status: 'cancelled', total: 540 }),
      order({ id: '3', status: 'delivered', total: 360, items: [{ product_id: 'prod-1', name: 'Mango Pickle', weight: '250 g', price: 180, quantity: 2 }] }),
    ],
    testProducts,
    '2026-10-17',
    '2026-10-17'
  );
  assert.equal(report.total_orders, 3);
  assert.equal(report.pending, 1);
  assert.equal(report.order_value, 540);
  assert.equal(report.daily[0].orders, 3);
  assert.equal(report.daily[0].value, 540);
  assert.equal(report.top_products[0].quantity, 3);
  assert.equal(report.top_products[0].value, 540);
  assert.equal(report.by_status.find((s) => s.status === 'cancelled')?.count, 1);
});

test('Empty date ranges report zero activity and only count visible products', () => {
  const report = calculateMetrics(
    [],
    testProducts.map((p, i) => ({ ...p, available: i === 0 })),
    '2026-10-17',
    '2026-10-17'
  );
  assert.equal(report.total_orders, 0);
  assert.equal(report.order_value, 0);
  assert.equal(report.active_products, 1);
  assert.deepEqual(report.daily, []);
  assert.deepEqual(report.top_products, []);
});

test('CSV escapes quotes and prevents spreadsheet formulas from product names', () => {
  const csv = serializeCsv([
    ['Product', 'Value'],
    ['=HYPERLINK("bad")', 180],
    ['Spicy, "mango"', 220],
    ['+SUM(1,2)', 1],
  ]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"Spicy, ""mango"""'));
  assert.ok(csv.includes('"\'+SUM(1,2)"'));
  assert.equal(csv.split('\r\n').length, 4);
});

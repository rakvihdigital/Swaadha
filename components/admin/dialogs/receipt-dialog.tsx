'use client';
import { Printer } from 'lucide-react';
import { money } from '@/lib/admin';
import { Modal } from '../modal';
import { useAdmin } from '../context';

/** The printable receipt after a POS sale. */
export function ReceiptDialog() {
  const { posReceiptOrder, setPosReceiptOrder } = useAdmin();
  if (!posReceiptOrder) return null;

  return (
    <Modal title="Kitchen POS Bill / Receipt" onClose={() => setPosReceiptOrder(null)}>
      <div className="pos-receipt-container" style={{ padding: '10px 0', textAlign: 'center' }}>
        <div
          id="thermal-receipt-slip"
          style={{
            background: '#fff',
            border: '1px dashed #e2b653',
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
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontFamily: 'serif', color: '#c8202a' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c8202a' }}>
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
  );
}

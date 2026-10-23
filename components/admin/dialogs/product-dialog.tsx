'use client';
import { Barcode, Check, Upload } from 'lucide-react';
import { cleanBarcodeValue, generateBarcodeValue, MAX_LABEL_CODE_LENGTH, productBarcode } from '../barcode';
import { Modal } from '../modal';
import { useAdmin } from '../context';

/** Add or edit a product. */
export function ProductDialog() {
  const {
    productEdit,
    busy,
    categories,
    error,
    handleFileUpload,
    products,
    saveProduct,
    setProductEdit,
    uploadingImage,
  } = useAdmin();
  if (!productEdit) return null;

  // Codes already used by other products, so a new one never clashes.
  const takenCodes = products.filter((p) => p.id !== productEdit.id).map(productBarcode);
  const typedCode = productEdit.barcode?.trim() ? cleanBarcodeValue(productEdit.barcode.trim()) : '';
  const codeWarning = !typedCode
    ? ''
    : takenCodes.includes(typedCode)
      ? 'Another product already uses this code. Press Auto for a new one.'
      : typedCode.length > MAX_LABEL_CODE_LENGTH
        ? `Too long to scan on a small sticker. Keep it to ${MAX_LABEL_CODE_LENGTH} characters or press Auto.`
        : '';

  return (
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
                    barcode: generateBarcodeValue(productEdit.sku, takenCodes),
                  })
                }
              >
                <Barcode size={14} /> Auto
              </button>
            </div>
          </label>
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
            <small style={{ color: codeWarning ? 'var(--red)' : 'var(--ink-mute)', fontSize: 11, fontWeight: codeWarning ? 700 : 400 }}>
              {codeWarning || 'Leave empty to get a short code automatically. Scannable at the POS counter.'}
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
  );
}

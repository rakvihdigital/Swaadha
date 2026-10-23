'use client';
import { Check, Upload } from 'lucide-react';
import { getCategoryImage } from '@/lib/admin';
import { Modal } from '../modal';
import { useAdmin } from '../context';

/** Add or edit a category. */
export function CategoryDialog() {
  const {
    categoryEdit,
    busy,
    error,
    handleFileUpload,
    saveCategory,
    setCategoryEdit,
    uploadingImage,
  } = useAdmin();
  if (!categoryEdit) return null;

  return (
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
  );
}

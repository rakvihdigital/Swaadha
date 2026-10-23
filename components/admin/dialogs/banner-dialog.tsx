'use client';
import { Check, Upload } from 'lucide-react';
import { Modal } from '../modal';
import { useAdmin } from '../context';

/** Add or edit a homepage hero banner. */
export function BannerDialog() {
  const { bannerEdit, busy, error, handleFileUpload, saveBanner, setBannerEdit, uploadingImage } = useAdmin();
  if (!bannerEdit) return null;

  return (
    <Modal title={bannerEdit.id ? 'Edit hero banner' : 'Add hero banner'} onClose={() => setBannerEdit(null)}>
      <form onSubmit={saveBanner}>
        <div className="form-row">
          <label>
            Tag / Kicker
            <input
              required
              maxLength={100}
              placeholder="e.g. THE CELEBRATION COLLECTION"
              value={bannerEdit.tag}
              onChange={(e) => setBannerEdit({ ...bannerEdit, tag: e.target.value })}
            />
          </label>
          <label>
            Display order
            <input
              required
              type="number"
              min={1}
              value={bannerEdit.display_order}
              onChange={(e) => setBannerEdit({ ...bannerEdit, display_order: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Main title
            <input
              required
              maxLength={100}
              placeholder="e.g. Little sweets,"
              value={bannerEdit.title}
              onChange={(e) => setBannerEdit({ ...bannerEdit, title: e.target.value })}
            />
          </label>
          <label>
            Highlight text (italic)
            <input
              maxLength={100}
              placeholder="e.g. lasting memories."
              value={bannerEdit.em}
              onChange={(e) => setBannerEdit({ ...bannerEdit, em: e.target.value })}
            />
          </label>
        </div>
        <label>
          Description
          <textarea
            rows={3}
            maxLength={500}
            placeholder="Short tagline shown over the banner"
            value={bannerEdit.text}
            onChange={(e) => setBannerEdit({ ...bannerEdit, text: e.target.value })}
          />
        </label>
        <div className="form-row">
          <label>
            Thumbnail label
            <input
              maxLength={50}
              placeholder="e.g. Sweet celebrations"
              value={bannerEdit.label}
              onChange={(e) => setBannerEdit({ ...bannerEdit, label: e.target.value })}
            />
          </label>
          <label>
            Button Link (href)
            <input
              maxLength={200}
              placeholder="/products?category=Sweets"
              value={bannerEdit.href}
              onChange={(e) => setBannerEdit({ ...bannerEdit, href: e.target.value })}
            />
          </label>
        </div>

        {/* Banner Image URL + Upload */}
        <label>
          Banner image URL
          <input
            required
            type="text"
            placeholder="https://… or upload below"
            value={bannerEdit.image}
            onChange={(e) => setBannerEdit({ ...bannerEdit, image: e.target.value })}
          />
        </label>
        <div className="storage-uploader-box">
          <label className="upload-btn-label">
            <Upload size={14} /> {uploadingImage ? 'Uploading to Supabase…' : 'Upload image to banners bucket'}
            <input
              type="file"
              accept="image/*"
              disabled={uploadingImage}
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f, 'banners', (url) => setBannerEdit((prev) => (prev ? { ...prev, image: url } : null)));
              }}
            />
          </label>
          {bannerEdit.image && (
            <img src={bannerEdit.image} alt="Preview" style={{ width: 68, height: 42, objectFit: 'cover', borderRadius: 4 }} />
          )}
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={bannerEdit.is_active}
            onChange={(e) => setBannerEdit({ ...bannerEdit, is_active: e.target.checked })}
          />{' '}
          Active (display on storefront)
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button modal-save" disabled={busy || uploadingImage}>
          <Check size={16} /> Save banner
        </button>
      </form>
    </Modal>
  );
}

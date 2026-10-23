'use client';
import { Pencil } from 'lucide-react';
import { useAdmin } from '@/components/admin/context';
import { getCategoryImage } from '@/lib/admin';

export default function CategoriesPage() {
  const { can, categories, products, setCategoryEdit } = useAdmin();
  return (
    <>
      <title>Categories · Kitchen admin | Swaadha</title>
      <div className="category-management-grid">
        {categories.map((c) => {
          const catImage = getCategoryImage(c);
          return (
            <article key={c.id} className="dashboard-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <img
                  src={catImage}
                  alt={c.name}
                  className="category-img-thumb"
                  style={{ width: 68, height: 68, borderRadius: 12, objectFit: 'cover' }}
                />
                <span className={`status ${c.enabled ? 'available' : ''}`}>{c.enabled ? 'Visible' : 'Hidden'}</span>
              </div>
              <h3 style={{ marginBottom: 4 }}>{c.name}</h3>
              <p style={{ minHeight: 40, fontSize: 11 }}>{c.description || 'A home for your next homemade favorite.'}</p>
              <div className="category-card-bottom" style={{ marginTop: 'auto', paddingTop: 10 }}>
                <span>{can('products') ? `${products.filter((p) => p.category === c.name).length} products` : 'Kitchen category'}</span>
                <button className="table-action" onClick={() => setCategoryEdit(c)}>
                  <Pencil size={14} /> Edit category
                </button>
              </div>
            </article>
          );
        })}
        {!categories.length && <p className="empty">Add your first category to organize the menu.</p>}
      </div>
    </>
  );
}

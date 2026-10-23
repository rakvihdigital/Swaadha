'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Product } from '@/lib/products';
import { Category, getCategoryImage } from '@/lib/admin';
import { loadMenu } from '@/lib/storefront';
import { ProductCard } from './product-card';

const ALL = 'All favorites';

export function Catalog({ featured = false }: { featured?: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const pills = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get('category');
    if (selected) setCategory(selected);
    let disposed = false;
    loadMenu()
      .then((data) => {
        if (!disposed) {
          setProducts(data.products);
          setCategories(data.categories);
        }
      })
      .catch((e) => {
        if (!disposed) setError(e.message);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, []);

  // Slide the gold indicator under whichever pill is selected.
  useLayoutEffect(() => {
    const wrap = pills.current;
    const el = wrap?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!wrap || !el) return;
    const place = () => {
      wrap.style.setProperty('--pill-x', `${el.offsetLeft}px`);
      wrap.style.setProperty('--pill-w', `${el.offsetWidth}px`);
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [category, categories]);

  const names = [ALL, ...categories.map((c) => c.name)];
  const filtered = products.filter(
    (p) => (category === ALL || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase())
  );
  const shown = featured
    ? [...filtered].sort((a, b) => Number(b.image.startsWith('/images/products/')) - Number(a.image.startsWith('/images/products/'))).slice(0, 4)
    : filtered;

  return (
    <div className="sw-catalog">
      {!featured && categories.length > 0 && (
        <div className="sw-cat-showcase" role="navigation" aria-label="Browse categories" data-stagger>
          {[{ id: 'all', name: ALL, image: '/images/hero.webp' } as Category, ...categories].map((c) => {
            const count = c.name === ALL ? products.length : products.filter((p) => p.category === c.name).length;
            return (
              <button
                key={c.id}
                type="button"
                data-reveal="up"
                className={`sw-cat-tile ${category === c.name ? 'is-active' : ''}`}
                onClick={() => setCategory(c.name)}
              >
                <span className="sw-cat-tile-img">
                  <img src={c.name === ALL ? '/images/hero.webp' : getCategoryImage(c)} alt="" />
                </span>
                <span className="sw-cat-tile-name">{c.name}</span>
                <span className="sw-cat-tile-count">
                  {count} {count === 1 ? 'product' : 'products'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className={`sw-catalog-tools ${featured ? 'is-featured' : ''}`}>
        <div className="sw-pills" ref={pills} role="group" aria-label="Filter by category">
          <span className="sw-pills-indicator" aria-hidden="true" />
          {names.map((c) => (
            <button key={c} aria-pressed={c === category} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        {!featured && (
          <label className="sw-search">
            <Search size={16} />
            <input aria-label="Search kitchen products" placeholder="Find your favorite…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>
                <X size={14} />
              </button>
            )}
          </label>
        )}
      </div>

      {error && (
        <p className="sw-alert is-error" role="alert">
          {error}
        </p>
      )}

      <div className="sw-grid" key={`${category}-${loading}`} data-stagger>
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <div className="sw-card-skeleton" key={i} aria-hidden="true">
                <span />
                <i />
                <i />
              </div>
            ))
          : shown.map((p) => <ProductCard product={p} key={p.id} />)}
      </div>

      {!loading && !shown.length && !error && (
        <div className="sw-empty">
          <h3>No favorites here yet.</h3>
          <p>Check back soon, or ask our kitchen what&apos;s cooking.</p>
        </div>
      )}
    </div>
  );
}

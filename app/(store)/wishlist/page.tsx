'use client';
import Link from 'next/link';
import { ArrowUpRight, Heart, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCommerce } from '@/components/commerce';
import { ProductCard } from '@/components/product-card';
import { PageHero } from '@/components/page-hero';
import { loadMenu } from '@/lib/storefront';
import { Product } from '@/lib/products';

export default function Wishlist() {
  const { wishlist, cart, ready, toggleWish, add } = useCommerce();
  const [menu, setMenu] = useState<Product[] | null>(null);
  useEffect(() => {
    loadMenu()
      .then((d) => setMenu(d.products))
      .catch(() => setMenu(null));
  }, []);

  // Saved items with their latest price and stock from the menu.
  const saved = wishlist.map((w) => ({ saved: w, current: menu?.find((p) => p.id === w.id) }));
  const addable = saved.filter(({ current }) => current && (current.stock ?? 0) > 0 && !cart.some((i) => i.product.id === current.id));
  const suggestions = (menu ?? []).filter((p) => (p.stock ?? 0) > 0 && !wishlist.some((w) => w.id === p.id)).slice(0, 4);

  return (
    <>
      <PageHero
        compact
        kicker={
          <>
            <Heart size={12} /> Saved with love
          </>
        }
        lines={['Your little list', <>of <em>happy things.</em></>]}
        text="Your wishlist is saved in this browser. Add a favorite to your bag whenever the craving calls."
      />
      <section className="sw-section sw-wish">
        {ready && !wishlist.length ? (
          <div className="sw-empty" data-reveal="up">
            <span className="sw-empty-icon">
              <Heart size={30} />
            </span>
            <h2>A little empty, for now.</h2>
            <p>Tap the heart on anything you love and it will wait for you here.</p>
            <Link className="sw-btn is-red" href="/products" data-magnetic>
              <span>Explore the kitchen</span>
              <ArrowUpRight size={17} />
            </Link>
          </div>
        ) : (
          <>
            <div className="sw-wish-bar" data-reveal="up">
              <div>
                <span className="sw-wish-count">{wishlist.length}</span>
                <p>
                  <b>{wishlist.length === 1 ? 'Saved favorite' : 'Saved favorites'}</b>
                  {addable.length ? `${addable.length} ready to add to your bag` : 'Everything here is already in your bag'}
                </p>
              </div>
              <div className="sw-wish-actions">
                <Link className="sw-link" href="/products">
                  Keep exploring <ArrowUpRight size={14} />
                </Link>
                <button className="sw-btn is-red" disabled={!addable.length} onClick={() => addable.forEach(({ current }) => add(current!))}>
                  <ShoppingBag size={16} />
                  <span>Add all to bag</span>
                </button>
              </div>
            </div>
            <div className="sw-grid" data-stagger>
              {saved.map(({ saved: item, current }) =>
                menu && !current ? (
                  <article className="sw-panel sw-gone" key={item.id}>
                    <span className="sw-empty-icon">
                      <Heart size={22} />
                    </span>
                    <h3>{item.name}</h3>
                    <p>This product is no longer on the menu.</p>
                    <button className="sw-link" onClick={() => toggleWish(item)}>
                      Remove from wishlist
                    </button>
                  </article>
                ) : (
                  <ProductCard key={item.id} product={current ?? item} />
                )
              )}
            </div>
          </>
        )}

        {ready && suggestions.length > 0 && (
          <div className="sw-cart-more">
            <div className="sw-head is-split">
              <div>
                <span className="sw-kicker">You might also love</span>
                <h2>
                  More little <em>joys.</em>
                </h2>
              </div>
              <Link className="sw-link" href="/products">
                See the whole kitchen <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="sw-grid" data-stagger>
              {suggestions.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

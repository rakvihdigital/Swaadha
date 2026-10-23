'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import { loadBanners } from '@/lib/storefront';
import { Banner } from '@/lib/admin';

export function HeritageHero() {
  const [slides, setSlides] = useState<Banner[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    loadBanners()
      .then((data) => {
        setSlides(data || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    if (paused || preference.matches || slides.length <= 1) return;
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  if (!loaded) {
    return <section className="heritage-hero" style={{ minHeight: 400 }} aria-label="Loading hero..." />;
  }

  // If no banners are added yet in the database, show clean brand hero
  if (slides.length === 0) {
    return (
      <section className="heritage-hero" aria-label="Welcome to Swaadha">
        <div className="heritage-slide">
          <div className="heritage-shade" />
          <div className="heritage-copy" style={{ maxWidth: 700, padding: '40px 0' }}>
            <span>THE SWAADHA FAMILY KITCHEN</span>
            <h1>
              Rooted in tradition,
              <br />
              <em>made with love.</em>
            </h1>
            <div className="heritage-ornament" aria-hidden="true">
              <span />✳<span />
            </div>
            <p>Bringing authentic flavors and fresh ingredients from our family kitchen to yours.</p>
            <div>
              <Link className="heritage-shop" href="/products">
                EXPLORE OUR KITCHEN <ArrowRight size={16} />
              </Link>
              <Link className="heritage-story" href="/our-story">
                OUR STORY
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const currentIndex = active >= slides.length ? 0 : active;
  const s = slides[currentIndex];

  return (
    <section className="heritage-hero" aria-label="Featured kitchen collections" aria-roledescription="carousel">
      <div className="heritage-slide" key={s.id || currentIndex}>
        <img className="heritage-backdrop" src={s.image} alt={s.label || s.title} fetchPriority="high" />
        <div className="heritage-shade" />
        <div className="banner-photo-note">
          <span>THE SWAADHA WAY</span>
          <b>
            Good food.
            <br />
            Beautiful memories.
          </b>
        </div>
        <div className="heritage-copy">
          <span>{s.tag}</span>
          <h1>
            {s.title}
            <br />
            <em>{s.em}</em>
          </h1>
          <div className="heritage-ornament" aria-hidden="true">
            <span />✳<span />
          </div>
          <p>{s.text}</p>
          <div>
            <Link className="heritage-shop" href={s.href || '/products'}>
              EXPLORE THE COLLECTION <ArrowRight size={16} />
            </Link>
            <Link className="heritage-story" href="/our-story">
              OUR STORY
            </Link>
          </div>
        </div>
      </div>
      <div className="heritage-frame" aria-hidden="true" />
      <div className="heritage-navigation">
        <span className="heritage-navigation-note">FAMILY RECIPES · FRESHLY PREPARED</span>
        <div className="heritage-controls">
          <span className="heritage-count">
            0{currentIndex + 1}
            <small> / 0{slides.length}</small>
          </span>
          <div className="heritage-progress">
            {slides.map((slide, i) => (
              <button
                key={slide.id || i}
                aria-label={`Show ${slide.label || slide.title}`}
                aria-pressed={currentIndex === i}
                className={currentIndex === i ? 'active' : ''}
                onClick={() => setActive(i)}
              />
            ))}
          </div>
          <button
            aria-label="Previous collection"
            onClick={() => setActive((currentIndex + slides.length - 1) % slides.length)}
          >
            <ArrowLeft size={17} />
          </button>
          <button
            aria-label="Next collection"
            onClick={() => setActive((currentIndex + 1) % slides.length)}
          >
            <ArrowRight size={17} />
          </button>
          <button
            aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </div>
        <div className="heritage-thumbnails">
          {slides.map((slide, i) => (
            <button
              key={slide.id || i}
              aria-label={`View ${slide.label || slide.title}`}
              aria-pressed={i === currentIndex}
              className={i === currentIndex ? 'active' : ''}
              onClick={() => setActive(i)}
            >
              <img src={slide.image} alt="" />
              <span>{slide.label || slide.title}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

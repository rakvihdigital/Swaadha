'use client';

import { Fragment, useEffect, useId } from 'react';
import { usePathname } from 'next/navigation';

/*
 * Site-wide motion. Markup opts in with data attributes so pages stay server-renderable:
 *   data-reveal="up|fade|scale|left|right|clip"  → gains .is-in when scrolled into view
 *   data-stagger                                  → children reveal one after another
 *   data-parallax="0.15"                          → drifts against the scroll
 *   data-tilt                                     → 3D tilt toward the pointer
 *   data-magnetic                                 → pulls gently toward the pointer
 *   data-count="100"                              → counts up when revealed
 *   data-scrub                                    → exposes scroll progress through it as --p (0 → 1)
 * Everything is skipped when <html> lacks .motion (reduced motion, or the boot script did not run).
 */
export function MotionRoot() {
  const path = usePathname();

  useEffect(() => {
    try {
      sessionStorage.setItem('sw-intro', '1');
    } catch {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('motion') || !('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-reveal]').forEach((n) => n.classList.add('is-in'));
      document.querySelectorAll<HTMLElement>('[data-count]').forEach((n) => (n.textContent = n.dataset.count ?? ''));
      return;
    }

    const seen = new WeakSet<Element>();
    const parallax = new Set<HTMLElement>();
    const scrubs = new Set<HTMLElement>();
    const cleanups: (() => void)[] = [];

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.classList.add('is-in');
          el.querySelectorAll<HTMLElement>('[data-count]').forEach(count);
          if (el.dataset.count) count(el);
          reveal.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );

    function count(el: HTMLElement) {
      if (el.dataset.counted) return;
      el.dataset.counted = '1';
      const target = Number(el.dataset.count);
      const start = performance.now();
      const duration = 1600;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 4))));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    function scan() {
      document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
        [...group.children].forEach((child, i) => (child as HTMLElement).style.setProperty('--i', String(i)));
      });
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        reveal.observe(el);
      });
      document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
        if (seen.has(el) || el.closest('[data-reveal]')) return;
        seen.add(el);
        reveal.observe(el);
      });
      document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => parallax.add(el));
      document.querySelectorAll<HTMLElement>('[data-scrub]').forEach((el) => scrubs.add(el));
      if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);
          cleanups.push(tilt(el));
        });
        document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);
          cleanups.push(magnetic(el));
        });
      }
    }

    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const vh = window.innerHeight;
        parallax.forEach((el) => {
          if (!el.isConnected) return parallax.delete(el);
          const rect = el.getBoundingClientRect();
          if (rect.bottom < -200 || rect.top > vh + 200) return;
          const speed = Number(el.dataset.parallax) || 0.12;
          const offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
          el.style.setProperty('--py', `${offset.toFixed(1)}px`);
        });
        scrubs.forEach((el) => {
          if (!el.isConnected) return scrubs.delete(el);
          const rect = el.getBoundingClientRect();
          const p = (vh * 0.85 - rect.top) / (rect.height + vh * 0.35);
          el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(3));
        });
      });
    }

    scan();
    onScroll();
    const mutations = new MutationObserver(() => {
      scan();
      onScroll();
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      reveal.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cleanups.forEach((fn) => fn());
    };
  }, [path]);

  return null;
}

function tilt(el: HTMLElement) {
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const leave = () => {
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  return () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
  };
}

function magnetic(el: HTMLElement) {
  const move = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left - r.width / 2) * 0.28).toFixed(1)}px`);
    el.style.setProperty('--my', `${((e.clientY - r.top - r.height / 2) * 0.38).toFixed(1)}px`);
  };
  const leave = () => {
    el.style.setProperty('--mx', '0px');
    el.style.setProperty('--my', '0px');
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  return () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
  };
}

/** A heading whose lines rise out of a mask, one after another. */
export function Lines({
  as: Tag = 'h2',
  lines,
  className,
  id,
}: {
  as?: 'h1' | 'h2' | 'h3';
  lines: React.ReactNode[];
  className?: string;
  id?: string;
}) {
  return (
    <Tag className={`sw-lines ${className ?? ''}`} id={id} data-reveal="lines">
      {lines.map((line, i) => (
        <Fragment key={i}>
          <span className="sw-line">
            <span style={{ '--l': i } as React.CSSProperties}>{line}</span>
          </span>
          {i < lines.length - 1 && ' '}
        </Fragment>
      ))}
    </Tag>
  );
}

/** A paragraph whose words light up as it scrolls through the viewport. */
export function ScrubWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ');
  return (
    <p className={`sw-scrub ${className ?? ''}`} data-scrub style={{ '--n': words.length } as React.CSSProperties}>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span style={{ '--i': i } as React.CSSProperties}>{word}</span>{' '}
        </Fragment>
      ))}
    </p>
  );
}

/** Small gold rule with a diamond, echoing the logo's border. */
export function Ornament({ className }: { className?: string }) {
  return (
    <span className={`sw-ornament ${className ?? ''}`} aria-hidden="true">
      <i />
      <svg viewBox="0 0 24 24" width="14" height="14">
        <path d="M12 1 L15 9 L23 12 L15 15 L12 23 L9 15 L1 12 L9 9 Z" fill="currentColor" />
      </svg>
      <i />
    </span>
  );
}

/** Rotating circular seal with the brand promise. */
export function Seal({ text = 'TASTE THAT FEELS LIKE HOME ✦ HOMEMADE IN BANGALORE ✦ ', className }: { text?: string; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className={`sw-seal ${className ?? ''}`} aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <defs>
          <path id={`seal-${id}`} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text>
          <textPath href={`#seal-${id}`}>{text}</textPath>
        </text>
      </svg>
      <span>
        <svg viewBox="0 0 24 24" width="28" height="28">
          <path d="M12 1 L15 9 L23 12 L15 15 L12 23 L9 15 L1 12 L9 9 Z" fill="currentColor" />
        </svg>
      </span>
    </div>
  );
}

/** Infinite scrolling ribbon of phrases. */
export function Marquee({ items, reverse, className }: { items: string[]; reverse?: boolean; className?: string }) {
  const row = (hidden: boolean) => (
    <div className="sw-marquee-row" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <span key={i}>
          {item}
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M12 1 L15 9 L23 12 L15 15 L12 23 L9 15 L1 12 L9 9 Z" fill="currentColor" />
          </svg>
        </span>
      ))}
    </div>
  );
  return (
    <div className={`sw-marquee ${reverse ? 'is-reverse' : ''} ${className ?? ''}`}>
      <div className="sw-marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

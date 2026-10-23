import { Lines, Ornament } from './motion';

/** Crimson banner that opens every inner page. */
export function PageHero({
  kicker,
  lines,
  text,
  children,
  compact,
}: {
  kicker: React.ReactNode;
  lines: React.ReactNode[];
  text?: React.ReactNode;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`sw-pagehero ${compact ? 'is-compact' : ''} ${children ? 'has-art' : ''}`}>
      <div className="sw-grain" />
      <div className="sw-pagehero-glow" aria-hidden="true" />
      <div className="sw-pagehero-copy">
        <span className="sw-kicker is-light" data-reveal="fade">
          {kicker}
        </span>
        <Lines as="h1" lines={lines} />
        {text && <p data-reveal="up">{text}</p>}
        <Ornament />
      </div>
      {children && <div className="sw-pagehero-art">{children}</div>}
    </section>
  );
}

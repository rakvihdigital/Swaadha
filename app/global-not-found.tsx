import type { Metadata } from 'next';
import './(store)/store.css';
import { display, body, header } from './fonts';

export const metadata: Metadata = { title: 'Page not found | Swaadha' };

export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${header.variable}`}>
      <body>
        <main className="sw-404">
          <div className="sw-grain" />
          <img src="/logo-transparent.png" alt="Swaadha" />
          <span className="sw-kicker is-light">404 · Not on the menu</span>
          <h1>
            This page wandered
            <br />
            <em>out of the kitchen.</em>
          </h1>
          <p>Let&apos;s get you back to something delicious.</p>
          <a className="sw-btn is-gold" href="/">
            <span>Back home</span>
          </a>
        </main>
      </body>
    </html>
  );
}

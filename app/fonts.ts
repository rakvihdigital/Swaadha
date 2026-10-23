import { DM_Sans, Fraunces, Manrope } from 'next/font/google';

export const display = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['SOFT', 'opsz'],
  variable: '--font-display',
  display: 'swap',
});

export const body = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

// The header keeps the site's original typeface.
export const header = DM_Sans({
  subsets: ['latin'],
  variable: '--font-header',
  display: 'swap',
});

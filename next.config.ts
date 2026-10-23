import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // The storefront and admin use separate root layouts, so unmatched URLs need a global 404.
    globalNotFound: true,
  },
};

export default nextConfig;

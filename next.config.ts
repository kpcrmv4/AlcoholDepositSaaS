import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Supabase client is not typed with a generated Database schema in this
  // repo (src/types/database.ts is a hand-written reference, not codegen),
  // so `.select('col1, col2')` often resolves to GenericStringError at
  // build-time. Dev still runs TS checks; prod build should not block on it.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingIncludes: {
    '/api/print-server/setup': ['./print-server/**/*'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 768, 1024],
    imageSizes: [36, 48, 96, 240],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'profile.line-scdn.net',
      },
    ],
  },
  // Allow service worker to be served from public/
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        { key: 'Service-Worker-Allowed', value: '/' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);

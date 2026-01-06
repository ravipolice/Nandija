/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: true,
  },

  // Image optimization (SAFE for Turbopack)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'drive.google.com', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  compress: true,
  poweredByHeader: false,

  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },

  // 👇 REQUIRED for Next.js 16
  turbopack: {},
};

// Optional static export (unchanged)
if (process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') {
  nextConfig.output = 'export';
  nextConfig.images = { unoptimized: true };
}

module.exports = nextConfig;

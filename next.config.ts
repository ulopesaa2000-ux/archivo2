import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Performance optimizations
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
  // Using webpack instead of Turbopack to avoid ChunkLoadError issues
  // Allow access to remote image placeholder.
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
      {
        protocol: 'https',
        hostname: 'snow-wolverine-506185.hostingersite.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'supabase.sistemaindumentaria.com',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // imgproxy render endpoint (image transformations)
        protocol: 'https',
        hostname: 'supabase.sistemaindumentaria.com',
        pathname: '/storage/v1/render/image/public/**',
      },
    ],
  },
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }

    return config;
  },
};

export default nextConfig;

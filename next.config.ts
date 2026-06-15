// C:\Users\uriel\Downloads\enero 26\archivo2\next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  output: 'standalone',
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    turbopackFileSystemCacheForBuild: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
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
        pathname: '/**',
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
        protocol: 'https',
        hostname: 'supabase.sistemaindumentaria.com',
        pathname: '/storage/v1/render/image/public/**',
      },
    ],
  },
  transpilePackages: ['motion'],
}

export default nextConfig

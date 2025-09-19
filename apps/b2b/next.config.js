/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración experimental
  experimental: {
    // Configuraciones experimentales para Next.js 14
  },

  // Server external packages
  serverExternalPackages: ['bcryptjs'],

  // Configuración de imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Configuración de headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ]
  },

  // Configuración de redirects
  async redirects() {
    return [
      { source: '/', destination: '/catalogo', permanent: false },
      { source: '/tienda', destination: '/catalogo', permanent: true },
      { source: '/productos', destination: '/catalogo', permanent: true },
    ]
  },

  // Configuración de rewrites para API
  async rewrites() {
    return [
      { source: '/health', destination: '/api/health' },
    ]
  },

  // Configuración de compresión
  compress: true,

  // Configuración de análisis de bundle (solo en desarrollo)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './analyze/client.html',
            openAnalyzer: false,
          })
        )
      }
      return config
    },
  }),

  // Configuración de Webpack personalizada
  webpack: (config, { dev }) => {
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules\/(react|react-dom|next)/,
            priority: 20,
          },
          ui: {
            name: 'ui',
            chunks: 'all',
            test: /node_modules\/(@radix-ui|lucide-react|framer-motion)/,
            priority: 15,
          },
          lib: {
            name: 'lib',
            chunks: 'all',
            test: /node_modules\/(zod|zustand|clsx|tailwind-merge)/,
            priority: 10,
          },
          common: {
            name: 'common',
            chunks: 'all',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      }
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    }

    return config
  },

  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  output: process.env.NEXT_OUTPUT_MODE === 'standalone' ? 'standalone' : undefined,

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['app', 'components', 'lib', 'hooks', 'stores'],
  },

  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },

  poweredByHeader: false,
  reactStrictMode: true,
}

module.exports = nextConfig
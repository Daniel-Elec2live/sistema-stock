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
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ]
  },

  // Configuración de redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/catalogo',
        permanent: false,
      },
      {
        source: '/tienda',
        destination: '/catalogo',
        permanent: true,
      },
      {
        source: '/productos',
        destination: '/catalogo',
        permanent: true,
      },
    ]
  },

  // Configuración de rewrites para API
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
    ]
  },

  // Configuración de compresión
  compress: true,

  // Configuración de análisis de bundle (solo en desarrollo)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config: any, { isServer }: { isServer: boolean }) => {
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
  webpack: (config: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    // Optimizaciones para producción
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Chunk para vendors principales
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules\/(react|react-dom|next)/,
            priority: 20,
          },
          // Chunk para UI components
          ui: {
            name: 'ui',
            chunks: 'all',
            test: /node_modules\/(@radix-ui|lucide-react|framer-motion)/,
            priority: 15,
          },
          // Chunk para otras librerías
          lib: {
            name: 'lib',
            chunks: 'all',
            test: /node_modules\/(zod|zustand|clsx|tailwind-merge)/,
            priority: 10,
          },
          // Chunk común para código compartido
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

    // Alias para imports absolutos
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    }

    return config
  },

  // Variables de entorno públicas
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Configuración de output para self-hosting (opcional)
  output: process.env.NEXT_OUTPUT_MODE === 'standalone' ? 'standalone' : undefined,

  // Configuración de TypeScript
  typescript: {
    // Fallar el build si hay errores de TypeScript
    ignoreBuildErrors: false,
  },

  // Configuración de ESLint
  eslint: {
    // Fallar el build si hay errores de ESLint
    ignoreDuringBuilds: false,
    dirs: ['app', 'components', 'lib', 'hooks', 'stores'],
  },

  // Configuración de logging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },

  // Configuración de poweredByHeader
  poweredByHeader: false,

  // Configuración de reactStrictMode
  reactStrictMode: true,

}

module.exports = nextConfig
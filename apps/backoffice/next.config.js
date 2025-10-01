/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔥 SOLUCIÓN CACHE: Deshabilitar TODOS los caches de Next.js
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
    // Forzar runtime dinámico en todas las rutas
    dynamicIO: true
  },

  // Deshabilitar cache de compilación
  generateBuildId: async () => {
    // Generar ID único por build para invalidar cache
    return `build-${Date.now()}`
  },

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
  },

  // Configuración de headers de seguridad y NO-CACHE AGRESIVO
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // 🔥 ANTI-CACHE global
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ]
  },

  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['app', 'components', 'lib'],
  },
}

module.exports = nextConfig
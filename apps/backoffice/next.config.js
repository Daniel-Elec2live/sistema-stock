/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
  },
  images: {
    domains: [
      // Supabase storage domain - ajustar cuando tengas la URL real
      'your-project.supabase.co',
    ],
  },
}

module.exports = nextConfig
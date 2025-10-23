/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // Enable standalone output for Fly.io deployment
  output: 'standalone',
  env: {
    POLYGON_API_KEY: process.env.POLYGON_API_KEY,
    TWELVEDATA_API_KEY: process.env.TWELVEDATA_API_KEY,
    TRADIER_API_KEY: process.env.TRADIER_API_KEY,
    GEX_PROVIDER: process.env.GEX_PROVIDER,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
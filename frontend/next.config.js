/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self)',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      debug: path.resolve(__dirname, 'src/lib/debug-stub.js'),
    };
    return config;
  },
};

module.exports = nextConfig;

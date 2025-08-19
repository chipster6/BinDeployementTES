/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle optimization for <500KB target
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@tanstack/react-virtual',
      'lucide-react'
    ]
  },

  // Production build optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Code splitting and bundle analysis
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Enable webpack bundle analyzer in development
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Vendor chunk for external libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            enforce: true,
            minSize: 20000,
            maxSize: 100000, // Keep vendor chunks under 100KB
          },
          // UI components chunk
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            chunks: 'all',
            enforce: true,
            minSize: 10000,
            maxSize: 50000,
          },
          // External services chunk
          external: {
            test: /[\\/]src[\\/]components[\\/]external[\\/]/,
            name: 'external',
            chunks: 'all',
            enforce: true,
            minSize: 10000,
            maxSize: 50000,
          },
          // Optimized components chunk
          optimized: {
            test: /[\\/]src[\\/]components[\\/]optimized[\\/]/,
            name: 'optimized',
            chunks: 'all',
            enforce: true,
            minSize: 10000,
            maxSize: 50000,
          },
          // Hooks chunk
          hooks: {
            test: /[\\/]src[\\/]hooks[\\/]/,
            name: 'hooks',
            chunks: 'all',
            enforce: true,
            minSize: 5000,
            maxSize: 30000,
          },
          // Common utilities
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
            maxSize: 30000,
          }
        }
      };

      // Tree shaking optimization for Lucide icons
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    // Performance optimizations
    config.optimization.minimizer = [
      ...config.optimization.minimizer,
    ];

    return config;
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Compression
  compress: true,

  // Power optimizations for production
  poweredByHeader: false,
  generateEtags: false,

  // Output optimization
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Transpilation optimization
  transpilePackages: [
    '@tanstack/react-virtual',
    'react-window',
    'react-window-infinite-loader'
  ],
};

export default nextConfig;

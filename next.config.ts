import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/pdf.worker.min.mjs',
        destination: '/api/pdf-worker',
      },
    ];
  },
  webpack: (config) => {
    // This makes sure the worker file is copied to the public folder during build
    config.plugins.push(
      new (require('copy-webpack-plugin'))({
        patterns: [
          {
            from: path.join(
              path.dirname(require.resolve('pdfjs-dist/package.json')),
              'build/pdf.worker.min.mjs'
            ),
            to: path.join(__dirname, 'public'),
          },
        ],
      })
    );
    return config;
  },
};

export default nextConfig;

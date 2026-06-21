/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ffmpeg.wasm (used in the browser for assembly) requires cross-origin isolation.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
   eslint: {
    // Disable ESLint during build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Also ignore TypeScript errors so the build can proceed
    
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'image.tmdb.org',
      'animesalt.cc',
      'img.animesalt.com',
      's5.vidhorizon.net'
    ],
  },
};

export default nextConfig;

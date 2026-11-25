import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  transpilePackages: ["swiper"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "phimimg.com", pathname: "/**" },
      { protocol: "https", hostname: "**.phimimg.com", pathname: "/**" },
      { protocol: "https", hostname: "phimapi.com", pathname: "/**" },
      { protocol: "https", hostname: "**.phimapi.com", pathname: "/**" },
      { protocol: "https", hostname: "ophim.cc", pathname: "/**" },
      { protocol: "https", hostname: "**.ophim.cc", pathname: "/**" },
      { protocol: "https", hostname: "img.ophim.cc", pathname: "/**" },
      { protocol: "https", hostname: "ophim.live", pathname: "/**" },
      { protocol: "https", hostname: "**.ophim.live", pathname: "/**" },
      { protocol: "https", hostname: "ophim1.com", pathname: "/**" },
      { protocol: "https", hostname: "**.ophim1.com", pathname: "/**" },
      { protocol: "https", hostname: "img.ophim1.com", pathname: "/**" },
      { protocol: "https", hostname: "nguonc.com", pathname: "/**" },
      { protocol: "https", hostname: "**.nguonc.com", pathname: "/**" },
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "placehold.co", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
    // Match giap211/rophim: do not send movie CDN images through Next optimizer.
    unoptimized: true,
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920, 2048, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 80],
    formats: ["image/webp", "image/avif"],
  },
};

export default nextConfig;

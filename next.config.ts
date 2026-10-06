import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge sits on top of the navigation during demos.
  devIndicators: false,
  // Development only: lets a phone or tablet on the same network open the dev server by the
  // computer's LAN address (private ranges and .local names). Has no effect on production builds.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
};

export default nextConfig;

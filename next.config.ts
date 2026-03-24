import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 시 내부 IP(폰)에서 접근 허용
  allowedDevOrigins: [
    "192.168.0.100",
    "192.168.1.*",
    "192.168.*.*",
  ],
};

export default nextConfig;

import type { NextConfig } from "next";
import { execSync } from "child_process";

let commitHash = "dev";
try {
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch { /* dev 환경이면 'dev' 유지 */ }

const nextConfig: NextConfig = {
  // 개발 시 내부 IP(폰)에서 접근 허용
  allowedDevOrigins: [
    "192.168.0.100",
    "192.168.1.*",
    "192.168.*.*",
  ],
  env: {
    NEXT_PUBLIC_BUILD_HASH: commitHash,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;

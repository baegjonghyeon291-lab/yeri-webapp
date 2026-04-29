import type { NextConfig } from "next";
import { execSync } from "child_process";
import fs from "fs";

let commitHash = "dev";
try {
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  // git 없는 환경(Vercel CLI 배포 등)에서는 stamp-version-json.js가 미리 써둔 version.json 사용
  try {
    const vj = JSON.parse(fs.readFileSync("./public/version.json", "utf-8"));
    if (vj.version && vj.version !== "dev") commitHash = vj.version;
  } catch { /* 무시 */ }
}

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
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, max-age=0, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/version.json',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, max-age=0, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
};

export default nextConfig;

#!/usr/bin/env node
/**
 * 빌드 시 sw.js 내의 __SW_VERSION__ 을 고유 빌드 해시로 교체.
 * Vercel의 build command에서 next build 전에 실행됨.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const swPath = path.join(__dirname, '..', 'public', 'sw.js');
let sw = fs.readFileSync(swPath, 'utf-8');

let hash = 'dev';
try {
  hash = execSync('git rev-parse --short HEAD').toString().trim();
} catch { /* dev 환경 */ }

const version = `jhyr-${hash}-${Date.now()}`;
// __SW_VERSION__ 플레이스홀더이든 이전 빌드로 이미 교체된 값이든 항상 새 버전으로 덮어씀
sw = sw.replace(/__SW_VERSION__|'jhyr-[^']*'/, `'${version}'`);
fs.writeFileSync(swPath, sw, 'utf-8');
console.log(`[SW] Version stamped: ${version}`);

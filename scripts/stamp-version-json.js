#!/usr/bin/env node
/**
 * 빌드 시 public/version.json의 플레이스홀더를 실제 빌드 정보로 교체
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const vPath = path.join(__dirname, '..', 'public', 'version.json');

let hash = 'dev';
try {
  hash = execSync('git rev-parse --short HEAD').toString().trim();
} catch { /* dev */ }

const version = `${hash}-${Date.now()}`;
const buildTime = new Date().toISOString();

const content = JSON.stringify({ version, buildTime }, null, 2);
fs.writeFileSync(vPath, content, 'utf-8');
console.log(`[Version] Stamped: ${version} at ${buildTime}`);

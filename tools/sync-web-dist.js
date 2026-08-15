/* =====================================================================
 * tools/sync-web-dist.js — 把根目录前端资源同步到 web-dist/
 * ---------------------------------------------------------------------
 * Tauri v2 的 frontendDist 不允许指向包含 node_modules/src-tauri/target
 * 的目录，因此用独立目录 web-dist/ 作为打包前端。本脚本保证根目录
 * index.html 的改动（PWA/移动端适配等）同步到 web-dist，避免过期副本。
 * 用法（npm 脚本）：npm run sync:web（需经仓库自带便携 npm 执行）
 * ===================================================================== */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEST = path.join(ROOT, 'web-dist');

const FILES = ['index.html', 'engineAdapter.js', 'manifest.webmanifest'];
const DIRS = ['engine', 'worker', 'icons'];

fs.mkdirSync(DEST, { recursive: true });
for (const f of FILES) {
  fs.copyFileSync(path.join(ROOT, f), path.join(DEST, f));
}
for (const d of DIRS) {
  fs.cpSync(path.join(ROOT, d), path.join(DEST, d), { recursive: true, force: true });
}
console.log('[sync-web-dist] 已完成：index.html、engineAdapter.js、manifest、engine/、worker/、icons/ 已同步到 web-dist/');

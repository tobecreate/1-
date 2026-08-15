/* =====================================================================
 * tools/sync-web-dist.js — 把根目录前端资源同步到 web-dist/ 与 deploy/
 * ---------------------------------------------------------------------
 * · web-dist/：Tauri v2 的 frontendDist 不允许指向包含 node_modules/
 *   src-tauri/target 的目录，因此用独立目录 web-dist/ 作为打包前端
 *   （保留 24MB 内嵌引擎的 index.html 原样）。
 * · deploy/：PWA / 网页部署用的“外置引擎”版本。index.html 会剥离
 *   <script id="engine-embed"> 内嵌引擎块，体积骤减、首屏变快；
 *   引擎运行时改由 engineAdapter.js 的“外置路径”fetch engine/*.wasm
 *   /.data 及文件 Worker 加载，故 engine/、worker/ 必须同目录存在。
 * 用法（npm 脚本）：npm run sync:web（需经仓库自带便携 npm 执行）
 * ===================================================================== */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEST = path.join(ROOT, 'web-dist');
const DEPLOY = path.join(ROOT, 'deploy');

const FILES = ['index.html', 'engineAdapter.js', 'manifest.webmanifest'];
const DIRS = ['engine', 'worker', 'icons'];

// ===== web-dist/：Tauri 内嵌版（原样复制，含 24MB base64 引擎） =====
fs.mkdirSync(DEST, { recursive: true });
for (const f of FILES) {
  fs.copyFileSync(path.join(ROOT, f), path.join(DEST, f));
}
for (const d of DIRS) {
  fs.cpSync(path.join(ROOT, d), path.join(DEST, d), { recursive: true, force: true });
}
console.log('[sync-web-dist] 已完成：index.html、engineAdapter.js、manifest、engine/、worker/、icons/ 已同步到 web-dist/');

// ===== deploy/：PWA 外置引擎版（剥离内嵌引擎，另附 sw.js 供离线缓存） =====
fs.mkdirSync(DEPLOY, { recursive: true });
const rawHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const strippedHtml = rawHtml.replace(
  /<script id="engine-embed"[^>]*>[\s\S]*?<\/script>/,
  '<!-- engine-embed stripped for web deploy -->'
);
fs.writeFileSync(path.join(DEPLOY, 'index.html'), strippedHtml, 'utf8');
for (const f of FILES) {
  if (f === 'index.html') continue; // 已写入剥离版
  fs.copyFileSync(path.join(ROOT, f), path.join(DEPLOY, f));
}
fs.copyFileSync(path.join(ROOT, 'sw.js'), path.join(DEPLOY, 'sw.js'));
for (const d of DIRS) {
  fs.cpSync(path.join(ROOT, d), path.join(DEPLOY, d), { recursive: true, force: true });
}
console.log('[sync-web-dist] 已完成：deploy/（外置引擎版，已剥离内嵌引擎）生成，含 engine/、worker/、icons/、sw.js');

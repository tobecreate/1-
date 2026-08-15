/* =====================================================================
 * tools/build-standalone.js — 生成自包含 index.html
 * ---------------------------------------------------------------------
 * 把 Pikafish 引擎资源内嵌进 index.html，使文件可被双击（file://）直接运行：
 *   - engine/pikafish.wasm        → base64
 *   - engine/pikafish.data (NNUE) → base64
 *   - engine/pikafish.js          → 文本
 *   - worker/pikafish.worker.js   → 文本
 * 输出写入 <script id="engine-embed" type="text/plain"> 的 JSON 中。
 *
 * 运行（仓库自带便携 Node，无需全局安装）：
 *   node-portable\node-v20.15.0-win-x64\node.exe tools\build-standalone.js
 * ===================================================================== */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');

function readText(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function readB64(p) { return fs.readFileSync(path.join(ROOT, p)).toString('base64'); }

// HTML 内联脚本里出现 "</script" 会提前截断文本节点，统一转义
function escapeScriptTag(s) {
  return s.replace(/<\/script/gi, '<\\/script');
}

function main() {
  const html = readText('index.html');

  const embed = {
    wasm: readB64('engine/pikafish.wasm'),
    data: readB64('engine/pikafish.data'),
    js: escapeScriptTag(readText('engine/pikafish.js')),
    worker: escapeScriptTag(readText('worker/pikafish.worker.js'))
  };
  const json = JSON.stringify(embed);
  const marker = '/*__ENGINE_EMBED_PLACEHOLDER__*/';

  // 幂等：占位符存在则填充；否则替换整段 <script id="engine-embed"> 内容（支持反复重建）
  let out;
  if (html.indexOf(marker) >= 0) {
    out = html.replace(marker, json);
  } else {
    const tagRe = /(<script id="engine-embed" type="text\/plain">)[\s\S]*?(<\/script>)/;
    if (!tagRe.test(html)) {
      console.error('[build-standalone] 未找到 <script id="engine-embed">，请确认 index.html 结构完整');
      process.exit(1);
    }
    out = html.replace(tagRe, '$1' + json + '$2');
  }
  fs.writeFileSync(HTML, out);

  const sizeMB = (Buffer.byteLength(out) / 1048576).toFixed(1);
  const embedMB = (Buffer.byteLength(json) / 1048576).toFixed(1);
  console.log('[build-standalone] 完成：');
  console.log('  引擎内嵌数据：' + embedMB + ' MB');
  console.log('  index.html 体积：' + sizeMB + ' MB（双击 file:// 可直接运行）');
}

main();

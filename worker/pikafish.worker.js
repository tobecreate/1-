/* =====================================================================
 * worker/pikafish.worker.js
 * Pikafish WASM 引擎后台线程
 * ---------------------------------------------------------------------
 * 职责：
 *   1. 接收主线程传输的 wasm / data 二进制（避免Worker二次fetch）
 *   2. importScripts 加载 engine/pikafish.js 胶水代码
 *   3. 注入 wasmBinary + locateFile，等待 Module.ready
 *   4. 监听 UCI 指令（cmd）→ send_command 写入引擎 stdin
 *   5. 引擎 stdout → postMessage 回传主线程解析
 * ===================================================================== */
'use strict';

var __engine = null;

self.onmessage = function (e) {
  var d = e.data;
  if (d.type === 'init') {
    initEngine(d);
  } else if (d.type === 'cmd') {
    if (__engine) __engine.send_command(d.cmd);
  } else if (d.type === 'quit') {
    self.close();
  }
};

function initEngine(d) {
  try {
    // wasm 二进制：直接注入（已通过 postMessage 传输，不再 fetch）
    var wasmUrl = URL.createObjectURL(new Blob([d.wasm], { type: 'application/wasm' }));
    // NNUE data：blob URL 供 emscripten 解包到虚拟文件系统（/pikafish.nnue）
    var dataUrl = URL.createObjectURL(new Blob([d.data]));

    self.__module = {
      locateFile: function (path) {
        if (path.indexOf('.wasm') >= 0) return wasmUrl;
        if (path.indexOf('.data') >= 0) return dataUrl;
        return path;
      },
      wasmBinary: d.wasm,
      read_stdout: function (line) {
        self.postMessage({ type: 'stdout', line: line });
      }
    };

    // 同步加载引擎胶水代码（内嵌路径传 jsCode 文本，用 Blob URL 导入；服务器路径传 jsUrl 直接 importScripts）
    if (d.jsCode) {
      importScripts(URL.createObjectURL(new Blob([d.jsCode], { type: 'text/javascript' })));
    } else {
      importScripts(d.jsUrl);
    }

    // 工厂调用：填充 self.__module（含 Module.ready promise）
    Pikafish(self.__module);
    self.__module.ready.then(function () {
      __engine = self.__module;
      self.postMessage({ type: 'ready' });
    }).catch(function (err) {
      self.postMessage({ type: 'error', message: String(err) });
    });
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) });
  }
}

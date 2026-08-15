/* =====================================================================
 * engineAdapter.js — 统一引擎适配模块
 * ---------------------------------------------------------------------
 * 对接项目现有引擎抽象接口（上层调用方式完全不变）：
 *   setPosition(fen)
 *   startAnalysis(depth, multiPvNum)
 *   stopAnalysis()
 *   getTopMoves()
 * 以及 AI 走子/胜率所需的扩展接口：
 *   getBestMove(color, depth) / getScore()
 *
 * 后端：
 *   - 'pikafish' ：Pikafish WASM 引擎（WebWorker + 标准 UCI 协议），唯一后端
 * 内置 JS 引擎已彻底禁用（代码保留但所有路径不可达）；Pikafish 加载失败时
 * 状态置为 'failed' 并记录 error，界面明确报错，绝不降级到内置引擎。
 * ===================================================================== */
(function () {
  'use strict';

  // ===== 引擎资源路径（Live Server 下相对站点根；file:// 下由内嵌资源替代） =====
  var BASE = location.href.split('#')[0];
  var JS_URL = new URL('engine/pikafish.js', BASE).href;
  var WASM_URL = new URL('engine/pikafish.wasm', BASE).href;
  var DATA_URL = new URL('engine/pikafish.data', BASE).href;
  var WORKER_URL = new URL('worker/pikafish.worker.js', BASE).href;

  // ===== 自包含内嵌引擎资源（由 tools/build-standalone.js 生成） =====
  // 双击 file:// 打开时浏览器禁止 fetch / 文件Worker / importScripts，
  // 因此把 wasm/data 以 base64、pikafish.js 与 worker 代码以文本内嵌进 index.html 的
  // <script id="engine-embed" type="text/plain">，此处解析后即可完全离线运行。
  function getEmbed() {
    var el = document.getElementById('engine-embed');
    if (!el) return null;
    var txt = el.textContent || '';
    if (!txt || txt.indexOf('ENGINE_EMBED_PLACEHOLDER') >= 0) return null;
    try { return JSON.parse(txt); } catch (e) { return null; }
  }
  var __EMBED__ = null; // 惰性读取

  /** base64 → Uint8Array */
  function b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // ===== 棋子类型 → FEN 字母 =====
  var TYPE2CHAR = { king: 'k', advisor: 'a', elephant: 'b', horse: 'n', chariot: 'r', cannon: 'c', soldier: 'p' };

  /** 内部棋盘数组 → 象棋 FEN（side: 'w'红先 / 'b'黑先） */
  function boardToFen(board, side) {
    var rows = [];
    for (var r = 0; r < 10; r++) {
      var line = '', empty = 0;
      for (var c = 0; c < 9; c++) {
        var p = board[r][c];
        if (!p) { empty++; continue; }
        if (empty > 0) { line += empty; empty = 0; }
        var ch = TYPE2CHAR[p.type];
        if (p.color === 'red') ch = ch.toUpperCase();
        line += ch;
      }
      if (empty > 0) line += empty;
      rows.push(line);
    }
    return rows.join('/') + ' ' + (side === 'black' ? 'b' : 'w') + ' - - 0 1';
  }

  /** UCI 走法字符串 → 内部 {from,to}
   *  Pikafish 坐标约定：文件 a-i（列0-8），rank 0-9 中 rank0 位于红方底线
   *  （红方视角），因此棋盘行 row = 9 - rank。 */
  var FILE2COL = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8 };
  function uciToMove(uci) {
    if (!uci || uci.length < 4) return null;
    var c0 = FILE2COL[uci[0]], r0 = 9 - parseInt(uci[1], 10);
    var c1 = FILE2COL[uci[2]], r1 = 9 - parseInt(uci[3], 10);
    if (c0 === undefined || c1 === undefined || isNaN(r0) || isNaN(r1)) return null;
    return { from: { row: r0, col: c0 }, to: { row: r1, col: c1 } };
  }

  /** 解析 info 行 */
  function parseInfoLine(line) {
    var parts = line.split(/\s+/);
    var info = { multipv: 1, depth: 0, score: null, mate: null, pv: [] };
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i];
      if (t === 'depth' && parts[i + 1]) info.depth = parseInt(parts[i + 1], 10);
      else if (t === 'multipv' && parts[i + 1]) info.multipv = parseInt(parts[i + 1], 10);
      else if (t === 'score' && parts[i + 1] === 'cp' && parts[i + 2]) info.score = parseInt(parts[i + 2], 10);
      else if (t === 'score' && parts[i + 1] === 'mate' && parts[i + 2]) info.mate = parseInt(parts[i + 2], 10);
      else if (t === 'pv') { info.pv = parts.slice(i + 1).filter(function (s) { return s && s !== 'ponder'; }); }
    }
    return info;
  }

  // ===== Pikafish 通信内核（Worker + UCI） =====
  function PikafishCore(opts) {
    this.opts = opts || {};
    this._worker = null;
    this._ready = false;
    this._failed = false;
    this._fen = '';
    this._info = [];
    this._bestMove = null;
    this._lastColor = 'red';   // 最近一次搜索的行棋方（Pikafish score 为行棋方视角）
    this._searching = false;
    this._searchToken = 0;
    this._resolveSearch = null;
    this._searchTimer = null;
  }

  PikafishCore.prototype.init = function () {
    var self = this;
    if (this._worker) return Promise.resolve(this._ready);
    var embed = __EMBED__ || (__EMBED__ = getEmbed());

    // 内嵌路径（file:// 双击打开）：wasm/data 直接解码，Worker 用 Blob 创建，jsCode 传给 Worker
    if (embed && embed.wasm && embed.data && embed.worker) {
      return new Promise(function (resolve, reject) {
        var wasm = b64ToBytes(embed.wasm).buffer;
        var data = b64ToBytes(embed.data).buffer;
        var w;
        try {
          w = new Worker(URL.createObjectURL(new Blob([embed.worker], { type: 'text/javascript' })));
        } catch (e) {
          reject(new Error('Blob Worker 创建失败: ' + e.message));
          return;
        }
        self._worker = w;
        w.onmessage = function (e) {
          var d = e.data;
          if (d.type === 'ready') {
            self._ready = true;
            self._send('uci');
            self._send('isready');
            resolve(true);
          } else if (d.type === 'stdout') {
            self._onStdout(d.line);
          } else if (d.type === 'error') {
            self._failed = true;
            reject(new Error(d.message));
          }
        };
        w.onerror = function (err) {
          self._failed = true;
          reject(err || new Error('worker crash'));
        };
        w.postMessage({ type: 'init', jsCode: embed.js, wasm: wasm, data: data }, [wasm, data]);
      });
    }

    // 服务器路径（http 打开）：fetch 资源 + 文件 Worker
    return Promise.all([
      fetch(WASM_URL).then(function (r) { if (!r.ok) throw new Error('wasm加载失败 ' + r.status); return r.arrayBuffer(); }),
      fetch(DATA_URL).then(function (r) { if (!r.ok) throw new Error('data加载失败 ' + r.status); return r.arrayBuffer(); })
    ]).then(function (bufs) {
      return new Promise(function (resolve, reject) {
        var w = new Worker(WORKER_URL);
        self._worker = w;
        w.onmessage = function (e) {
          var d = e.data;
          if (d.type === 'ready') {
            self._ready = true;
            self._send('uci');
            self._send('isready');
            resolve(true);
          } else if (d.type === 'stdout') {
            self._onStdout(d.line);
          } else if (d.type === 'error') {
            self._failed = true;
            reject(new Error(d.message));
          }
        };
        w.onerror = function (err) {
          self._failed = true;
          reject(err || new Error('worker crash'));
        };
        w.postMessage({ type: 'init', jsUrl: JS_URL, wasm: bufs[0], data: bufs[1] }, [bufs[0], bufs[1]]);
      });
    }).catch(function (err) {
      this._failed = true;
      console.error('[EngineAdapter] Pikafish初始化失败:', err);
      throw err;
    });
  };

  PikafishCore.prototype._send = function (cmd) {
    if (this._worker && this._ready) this._worker.postMessage({ type: 'cmd', cmd: cmd });
  };

  PikafishCore.prototype._onStdout = function (line) {
    line = String(line || '').trim();
    if (!line) return;
    if (line.indexOf('info') === 0) {
      var info = parseInfoLine(line);
      if (info.score !== null || info.mate !== null || info.pv.length > 0) {
        var idx = -1;
        for (var i = 0; i < this._info.length; i++) {
          if (this._info[i].multipv === info.multipv) { idx = i; break; }
        }
        if (idx >= 0) this._info[idx] = info; else this._info.push(info);
      }
    } else if (line.indexOf('bestmove') === 0) {
      var parts = line.split(/\s+/);
      var mvUci = parts[1] || '';
      var top = this._info[0] || null;
      var scoreRed = null, mateRed = 0;
      if (top) {
        if (top.mate !== null) mateRed = top.mate;
        else if (top.score !== null) scoreRed = top.score;
      }
      this._bestMove = { uci: mvUci, move: uciToMove(mvUci), score: scoreRed, mate: mateRed, depth: top ? top.depth : 0 };
      this._searching = false;
      if (this._searchTimer) { clearTimeout(this._searchTimer); this._searchTimer = null; }
      if (this._resolveSearch) { this._resolveSearch(this._bestMove); this._resolveSearch = null; }
    }
  };

  PikafishCore.prototype.setPosition = function (fen) {
    this._fen = fen;
    if (this._ready) this._send('position fen ' + fen);
  };

  PikafishCore.prototype.go = function (depth, multiPvNum, timeMs, color) {
    var self = this;
    if (!this._ready) return Promise.reject(new Error('引擎未就绪'));
    // 记录行棋方：Pikafish 的 info score cp/mate 是【当前行棋方视角】，换算红方视角时依赖此值
    this._lastColor = (color === 'black') ? 'black' : 'red';
    // 并发互斥：已有搜索先 stop
    if (this._searching) {
      this._send('stop');
      if (this._resolveSearch) { this._resolveSearch(null); this._resolveSearch = null; }
    }
    var token = ++this._searchToken;
    this._info = [];
    this._bestMove = null;
    this._searching = true;
    if (multiPvNum > 1) this._send('setoption name MultiPV value ' + multiPvNum);
    this._send('position fen ' + this._fen);
    // 深度优先 + 时间预算（movetime 到点自动 stop 返回当前最优），防止深度过大卡死
    if (timeMs > 0) this._send('go depth ' + depth + ' movetime ' + timeMs);
    else this._send('go depth ' + depth);

    return new Promise(function (resolve) {
      self._resolveSearch = function (bm) { if (token === self._searchToken) resolve(bm); };
      // 兜底超时保护：movetime 的2倍仍未返回则强制 stop
      var guard = (timeMs > 0 ? timeMs : 15000) + 2000;
      self._searchTimer = setTimeout(function () {
        if (self._searching) {
          console.warn('[EngineAdapter] 搜索超时，强制 stop');
          self._send('stop');
          self._searching = false;
          if (self._resolveSearch) { self._resolveSearch(null); self._resolveSearch = null; }
        }
      }, guard);
    });
  };

  PikafishCore.prototype.stop = function () {
    if (this._searching) this._send('stop');
    if (this._searchTimer) { clearTimeout(this._searchTimer); this._searchTimer = null; }
    this._searching = false;
    if (this._resolveSearch) { this._resolveSearch(null); this._resolveSearch = null; }
  };

  PikafishCore.prototype.quit = function () {
    if (this._searchTimer) clearTimeout(this._searchTimer);
    if (this._worker) {
      try { this._worker.postMessage({ type: 'quit' }); } catch (e) {}
      try { this._worker.terminate(); } catch (e) {}
      this._worker = null;
    }
    this._ready = false;
  };

  // ===== 统一引擎适配模块（对外接口） =====
  var EngineAdapter = {
    backend: 'pikafish',            // 唯一后端：'pikafish'（内置JS引擎已禁用）
    state: 'idle',                  // 'idle' | 'loading' | 'ready' | 'failed'
    error: '',                      // 加载失败原因（state==='failed' 时供界面提示）
    _pf: null,
    _onStateChange: null,           // 加载状态回调（用于页面提示）

    /**
     * 切换引擎后端（仅支持 Pikafish；开关持久化到 localStorage）
     * @param name 仅 'pikafish' 生效，其余一律按 'pikafish' 处理
     */
    setBackend: function (name) {
      try { localStorage.setItem('xiangqiEngine', 'pikafish'); } catch (e) {}
      this._applyBackend(name);
      return this.backend;
    },

    /** 读取持久化开关并应用（历史调试入口保留；页面默认由 index.html 强制 Pikafish） */
    applyStoredBackend: function () {
      var saved = 'pikafish';
      try { saved = localStorage.getItem('xiangqiEngine') || 'pikafish'; } catch (e) {}
      this._applyBackend(saved);
      return this.backend;
    },

    _applyBackend: function (name) {
      // 唯一后端为 Pikafish：任何请求一律按 pikafish 处理（内置JS引擎已彻底禁用）
      this.backend = 'pikafish';
      // 未创建过，或上次加载失败需重试 → 重建并初始化
      if (!this._pf || this.state === 'failed') {
        this._startLoad();
      }
    },

    _retryCount: 0,

    _startLoad: function () {
      var self = this;
      if (this._pf) { try { this._pf.quit(); } catch (e) {} }
      this.state = 'loading';
      this.error = '';
      this._notify();
      this._pf = new PikafishCore({ timeoutMs: 15000 });
      this._pf.init().then(function () {
        self._retryCount = 0;
        self.state = 'ready';
        self._notify();
      }).catch(function (err) {
        var msg = (err && err.message) ? String(err.message) : '加载失败';
        // 自动重试（最多3次，间隔1.5s），应对瞬时加载失败
        if (self._retryCount < 3) {
          self._retryCount++;
          console.warn('[EngineAdapter] Pikafish加载失败(' + self._retryCount + '/3)，自动重试：', msg);
          setTimeout(function () { self._startLoad(); }, 1500);
          return;
        }
        self._retryCount = 0;
        // 绝不降级内置引擎：保持 pikafish 后端，置为 failed 并记录错误供界面提示
        self.state = 'failed';
        self.error = msg;
        if (!getEmbed() && location.protocol === 'file:') {
          self.error += '（检测到 file:// 打开且缺少内嵌引擎资源，请运行构建脚本生成自包含版本）';
        }
        self._notify();
        console.error('[EngineAdapter] Pikafish加载失败，内置JS引擎已禁用：', err);
      });
    },

    _notify: function () {
      if (this._onStateChange) {
        try { this._onStateChange(this.state, this.backend); } catch (e) {}
      }
    },

    /** Pikafish 后端是否就绪可用 */
    isPikafishReady: function () {
      return this.backend === 'pikafish' && this._pf && this._pf._ready;
    },

    /** 设置局面（fen 字符串；上层 board 由 Engine 转 FEN） */
    setPosition: function (fen) {
      if (this.isPikafishReady()) this._pf.setPosition(fen);
    },

    /**
     * 启动搜索（UCI go depth + movetime 时间预算）
     * @param depth 搜索深度
     * @param multiPvNum 多候选数量
     * @param timeMs 时间预算（ms，0=不限，深度优先）
     * @param color 当前行棋方（'red'|'black'），用于分值视角换算
     * @returns Promise<bestMove|null>
     */
    startAnalysis: function (depth, multiPvNum, timeMs, color) {
      if (this.isPikafishReady()) {
        return this._pf.go(depth || 8, multiPvNum || 1, timeMs || 0, color);
      }
      return Promise.resolve(null);
    },

    /** 终止当前分析 */
    stopAnalysis: function () {
      if (this.isPikafishReady()) this._pf.stop();
    },

    /** AI 走子：返回 {from,to,score(AI视角),mate,depth} | null
     *  Pikafish score 为行棋方（=AI）视角，直接返回，不再额外取负 */
    getBestMove: function (color, depth, timeMs) {
      var self = this;
      return this.startAnalysis(depth, 1, timeMs, color).then(function (bm) {
        if (!bm || !bm.move) return null;
        return {
          from: bm.move.from, to: bm.move.to,
          score: bm.score,          // AI视角（行棋方视角）
          mate: bm.mate,
          depth: bm.depth, uci: bm.uci
        };
      }).catch(function (err) {
        console.error('[EngineAdapter] getBestMove失败:', err);
        return null;
      });
    },

    /** 最近一次搜索评估（转换为红方视角 cp 分，供胜率面板直接使用） */
    getScore: function () {
      if (!this.isPikafishReady() || !this._pf._bestMove) return null;
      var bm = this._pf._bestMove;
      var color = this._pf._lastColor; // 搜索时的行棋方
      // bm.score/mate 为行棋方视角 → 红方视角需在行棋方为黑时取负
      var isRed = (color === 'red');
      var scoreRed = bm.score !== null ? (isRed ? bm.score : -bm.score) : (bm.mate > 0 ? 90000 : -90000);
      var mateRed = isRed ? bm.mate : -bm.mate;
      if (bm.score === null && bm.mate === 0) {
        scoreRed = (isRed ? 1 : -1) * 90000; // 兜底，避免 NaN
      }
      return { score: scoreRed, depth: bm.depth || 0, mate: mateRed || 0 };
    },

    /** 多条候选招法（MultiPV） */
    getTopMoves: function (n) {
      n = n || 3;
      if (!this.isPikafishReady() || this._pf._info.length === 0) return [];
      var arr = this._pf._info.slice().sort(function (a, b) { return a.multipv - b.multipv; });
      var out = [];
      for (var i = 0; i < arr.length && i < n; i++) {
        var it = arr[i];
        if (!it.pv || it.pv.length === 0) continue;
        out.push({
          move: uciToMove(it.pv[0]),
          uci: it.pv[0],
          score: it.score,
          mate: it.mate || 0,
          depth: it.depth || 0,
          multipv: it.multipv
        });
      }
      return out;
    },

    /** 释放引擎 */
    quit: function () {
      if (this._pf) { this._pf.quit(); this._pf = null; }
      this.state = 'idle';
    }
  };

  // ===== 对外导出 =====
  window.EngineAdapter = EngineAdapter;
  window.boardToFen = boardToFen;
})();

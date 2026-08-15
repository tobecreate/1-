/* 中国象棋 · 雅弈 — Service Worker（PWA 离线缓存）
   index.html 为外置引擎版（已剥离内嵌引擎），需预缓存 wasm/data。 */
const CACHE_NAME='xiangqi-v1';
const PRECACHE=[
  './',
  'index.html',
  'engineAdapter.js',
  'engine/pikafish.js',
  'engine/pikafish.wasm',
  'engine/pikafish.data',
  'worker/pikafish.worker.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// 安装：逐个缓存，单个资源失败（如404）不影响整体安装
self.addEventListener('install',(event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache)=>Promise.allSettled(PRECACHE.map((url)=>cache.add(url))))
      .then(()=>self.skipWaiting())
  );
});

// 激活：清理旧版本缓存并接管页面
self.addEventListener('activate',(event)=>{
  event.waitUntil(
    caches.keys()
      .then((keys)=>Promise.all(keys.filter((k)=>k!==CACHE_NAME).map((k)=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',(event)=>{
  const req=event.request;
  if(req.method!=='GET')return;
  // 页面导航：网络优先，失败回退缓存 index.html
  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req)
        .then((res)=>{
          const copy=res.clone();
          caches.open(CACHE_NAME).then((cache)=>cache.put('index.html',copy));
          return res;
        })
        .catch(()=>caches.match('index.html'))
    );
    return;
  }
  // 其余请求：缓存优先，未命中则 fetch 并写入缓存
  event.respondWith(
    caches.match(req).then((hit)=>{
      if(hit)return hit;
      return fetch(req).then((res)=>{
        if(res&&res.status===200&&(res.type==='basic'||res.type==='cors')){
          const copy=res.clone();
          caches.open(CACHE_NAME).then((cache)=>cache.put(req,copy));
        }
        return res;
      });
    })
  );
});

const CACHE_NAME="rdo-cache-v2";
const URLS=["./","./index.html","./app.js","./db.js","./config.js","./manifest.webmanifest"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(URLS)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",e=>{const r=e.request;if(r.url.includes("supabase.co")){e.respondWith(fetch(r).catch(()=>caches.match(r)));return;}
e.respondWith(caches.match(r).then(resp=>resp||fetch(r).then(n=>caches.open(CACHE_NAME).then(c=>{c.put(r,n.clone());return n;})).catch(()=>caches.match("./index.html"))));});
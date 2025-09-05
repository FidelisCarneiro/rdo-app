const DB_NAME="rdoDB"; const DB_VERSION=1; const STORES=["drafts","pending","cache"];
function idbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;STORES.forEach(n=>{if(!db.objectStoreNames.contains(n))db.createObjectStore(n,{keyPath:"id"})});};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function idbPut(store,obj){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(store,"readwrite");tx.objectStore(store).put(obj);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error);});}
async function idbGetAll(store){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(store,"readonly");const q=tx.objectStore(store).getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error);});}
async function idbDelete(store,id){const db=await idbOpen();return new Promise((res,rej)=>{const tx=db.transaction(store,"readwrite");tx.objectStore(store).delete(id);tx.oncomplete=()=>res(true);tx.onerror=()=>rej(tx.error);});}
async function queuePending(op){op.id=op.id||crypto.randomUUID();op.created_at=op.created_at||new Date().toISOString();return idbPut("pending",op);}
async function getPending(){return idbGetAll("pending");}
async function clearPending(id){return idbDelete("pending",id);}
async function saveDraft(d){d.id=d.id||crypto.randomUUID();d.updated_at=new Date().toISOString();return idbPut("drafts",d);}
async function getDrafts(){return idbGetAll("drafts");}
async function deleteDraft(id){return idbDelete("drafts",id);}
async function cachePut(key,val){return idbPut("cache",{id:key,value:val,updated_at:new Date().toISOString()});}
async function cacheGetAll(){const all=await idbGetAll("cache");const m={};all.forEach(r=>m[r.id]=r.value);return m;}
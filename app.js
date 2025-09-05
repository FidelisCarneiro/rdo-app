const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
let supabaseClient=null; let sessionUser=null;
let masterData={works:[],contractors:[],activities:[],collaborators:[],teams:[],equipment:[]};

document.addEventListener("DOMContentLoaded", async ()=>{
  applyBrand();
  const cfg=window.APP_CONFIG;
  supabaseClient=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
  supabaseClient.auth.onAuthStateChange(async (_e,session)=>{
    sessionUser=session?.user||null;
    updateAuthUI();
    if(sessionUser){ await loadMasterData(); await renderRdoList(); attemptSync(); }
  });
  const { data:{ session } } = await supabaseClient.auth.getSession();
  sessionUser=session?.user||null; updateAuthUI();
  if(sessionUser){ await loadMasterData(); await renderRdoList(); attemptSync(); }

  if("serviceWorker" in navigator){ navigator.serviceWorker.register("./sw.js"); }

  $("#registerForm")?.addEventListener("submit", registerUser);
  $("#loginForm")?.addEventListener("submit", loginUser);
  $("#logoutBtn")?.addEventListener("click", async()=>{ await supabaseClient.auth.signOut(); });

  $("#newRdoBtn")?.addEventListener("click", ()=>showPage("page-new-rdo"));
  $("#listRdoBtn")?.addEventListener("click", ()=>showPage("page-list-rdo"));
  $("#mastersBtn")?.addEventListener("click", ()=>showPage("page-masters"));

  $("#rdoForm")?.addEventListener("submit", saveRDO);
  $("#addCollabEntry")?.addEventListener("click", addCollabRow);
  $("#addEquipEntry")?.addEventListener("click", addEquipRow);
  $("#addOccEntry")?.addEventListener("click", addOccRow);
  $("#genPdfBtn")?.addEventListener("click", generatePdf);

  $("#prefillLastBtn")?.addEventListener("click", prefillFromLast);
  $("#fetchWeatherBtn")?.addEventListener("click", fetchWeatherIntoForm);

  $("#uploadBtn")?.addEventListener("click", uploadFiles);

  window.addEventListener("online", attemptSync);
});

function applyBrand(){
  const c=window.APP_CONFIG.BRAND.colors, root=document.documentElement;
  root.style.setProperty("--skic-chumbo",c.skic_chumbo);
  root.style.setProperty("--skic-vermelho",c.skic_vermelho);
  root.style.setProperty("--skic-prata",c.skic_prata);
  root.style.setProperty("--skic-azul-egeu",c.azul_egeu);
  root.style.setProperty("--skic-azul-ceu",c.azul_ceu);
  root.style.setProperty("--skic-cinza-escuro",c.cinza_escuro);
  root.style.setProperty("--skic-laranja",c.laranja);
  document.title=window.APP_CONFIG.BRAND.name;
  $$("#brandName").forEach(e=>e.textContent=window.APP_CONFIG.BRAND.name);
}

async function registerUser(e){ e.preventDefault();
  const name=$("#reg_name").value.trim(), email=$("#reg_email").value.trim(), phone=$("#reg_phone").value.trim(), password=$("#reg_pass").value;
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if(error) return alert("Erro no cadastro: "+error.message);
  const { error:e2 } = await supabaseClient.from("profiles").insert([{ id:data.user.id, name, phone }]);
  if(e2) console.warn("Profile insert falhou (OK se RLS restringir):", e2.message);
  alert("Cadastro criado!");
}

async function loginUser(e){ e.preventDefault();
  const email=$("#login_email").value.trim(), password=$("#login_pass").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if(error) alert("Login falhou: "+error.message);
}

function updateAuthUI(){
  if(sessionUser){ $("#authArea").classList.add("hidden"); $("#appArea").classList.remove("hidden"); $("#userEmail").textContent=sessionUser.email; }
  else{ $("#authArea").classList.remove("hidden"); $("#appArea").classList.add("hidden"); }
}

function showPage(id){ $$(".page").forEach(p=>p.classList.add("hidden")); $("#"+id).classList.remove("hidden"); }

async function loadMasterData(){
  for(const t of ["contractors","works","activities","collaborators","teams","equipment"]){
    const { data, error } = await supabaseClient.from(t).select("*").order("created_at",{ascending:false});
    if(!error) masterData[t]=data;
  }
  fillSelect($("#work_id"), masterData.works, "id", "name");
  fillSelect($("#team_id"), masterData.teams, "id", "name");
  fillSelect($("#activity_id"), masterData.activities, "id", "name");
  fillSelect($("#collabSel"), masterData.collaborators, "id", "name");
  fillSelect($("#equipSel"), masterData.equipment, "id", "name");
}

function fillSelect(sel, items, valKey, labelKey){
  if(!sel) return;
  sel.innerHTML = `<option value="">-- selecionar --</option>` + (items||[]).map(i=>`<option value="${i[valKey]}">${i[labelKey]}</option>`).join("");
}

async function renderRdoList(){
  const list=$("#rdoList"); if(!list) return;
  const { data, error } = await supabaseClient.from("rdos").select("id,rdo_number,rdo_date,weekday,works(name)").order("rdo_date",{ascending:false}).limit(50);
  if(error){ list.innerHTML=`<p class="text-red-600">${error.message}</p>`; return; }
  list.innerHTML = (data||[]).map(r=>`
    <div class="p-3 rounded-xl bg-white shadow flex items-center justify-between mb-2">
      <div>
        <div class="font-semibold">RDO #${r.rdo_number} — ${formatDate(r.rdo_date)} (${r.weekday})</div>
        <div class="text-sm muted">${r.works?.name||""}</div>
      </div>
      <div class="flex gap-2">
        <button class="btn" onclick="openRdo('${r.id}')">Editar</button>
      </div>
    </div>`).join("");
}

async function openRdo(id){
  const { data, error } = await supabaseClient.from("rdos").select("*").eq("id", id).single();
  if(error) return alert("Erro ao abrir RDO: "+error.message);
  $("#rdo_id").value = data.id;
  $("#work_id").value = data.work_id||"";
  $("#rdo_date").value = data.rdo_date||"";
  $("#rdo_number").value = data.rdo_number||"";
  $("#weekday").value = data.weekday||"";
  showPage("page-new-rdo"); await refreshGallery();
}

async function prefillFromLast(){
  const work_id=$("#work_id").value||null;
  let q=supabaseClient.from("rdos").select("*").order("rdo_date",{ascending:false}).limit(1);
  if(work_id) q=q.eq("work_id",work_id);
  const { data, error } = await q;
  if(error) return alert("Falha ao buscar último RDO: "+error.message);
  if(data && data[0]){
    const last=data[0];
    $("#weekday").value = computeWeekday($("#rdo_date").value || new Date().toISOString().slice(0,10));
    $("#rdo_number").value = (last.rdo_number||0)+1;
    alert("Dados do último RDO aplicados (número incrementado e dia da semana).");
  } else alert("Não há RDO anterior para prefill.");
}

async function fetchWeatherIntoForm(){
  const cfg=window.APP_CONFIG;
  const work_id=$("#work_id").value;
  if(!work_id) return alert("Selecione a obra.");
  const work=masterData.works.find(w=>w.id===work_id);
  if(!work || !work.latitude || !work.longitude) return alert("Obra sem latitude/longitude.");
  let weather=null;
  try{
    if(cfg.USE_EDGE_WEATHER && cfg.WEATHER_FUNCTION_NAME){
      const { data, error } = await supabaseClient.functions.invoke(cfg.WEATHER_FUNCTION_NAME,{ body:{ lat:work.latitude, lon:work.longitude } });
      if(error) throw error; weather=data;
    } else {
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${work.latitude}&longitude=${work.longitude}&hourly=temperature_2m,precipitation,wind_speed_10m&timezone=auto`;
      const r=await fetch(url); weather=await r.json();
    }
  }catch(e){ console.error(e); alert("Falha ao buscar clima."); return; }
  const r=summarizeWeather(weather);
  $("#weather_morning").value=JSON.stringify(r.morning);
  $("#weather_afternoon").value=JSON.stringify(r.afternoon);
  $("#weather_night").value=JSON.stringify(r.night);
  alert("Condições climáticas preenchidas.");
}

function summarizeWeather(w){
  const hours=(w.hourly&&w.hourly.time)?w.hourly.time.map((t,i)=>({t, temp:w.hourly.temperature_2m[i], rain:w.hourly.precipitation[i], wind:w.hourly.wind_speed_10m[i]})):[];
  const seg={
    morning: hours.filter(h=>{const H=parseInt(h.t.slice(11,13)); return H>=6 && H<12;}),
    afternoon: hours.filter(h=>{const H=parseInt(h.t.slice(11,13)); return H>=12 && H<18;}),
    night: hours.filter(h=>{const H=parseInt(h.t.slice(11,13)); return H>=18 || H<6;}),
  };
  const agg=arr=>arr.length?{ temp_avg:+(arr.reduce((s,a)=>s+a.temp,0)/arr.length).toFixed(1), rain_sum:+arr.reduce((s,a)=>s+a.rain,0).toFixed(2), wind_avg:+(arr.reduce((s,a)=>s+a.wind,0)/arr.length).toFixed(1) }:{ temp_avg:null,rain_sum:null,wind_avg:null };
  return { morning:agg(seg.morning), afternoon:agg(seg.afternoon), night:agg(seg.night) };
}

async function saveRDO(e){
  e.preventDefault();
  const obj={
    id: $("#rdo_id").value || crypto.randomUUID(),
    work_id: $("#work_id").value || null,
    rdo_number: parseInt($("#rdo_number").value||"0"),
    rdo_date: $("#rdo_date").value || new Date().toISOString().slice(0,10),
    weekday: $("#weekday").value || computeWeekday($("#rdo_date").value || new Date().toISOString().slice(0,10)),
    weather_morning: tryParse($("#weather_morning").value),
    weather_afternoon: tryParse($("#weather_afternoon").value),
    weather_night: tryParse($("#weather_night").value),
    day_shift_effective: parseInt($("#day_eff").value||"0"),
    night_shift_effective: parseInt($("#night_eff").value||"0"),
    contractual_deadline_days: parseInt($("#prazo_contratual").value||"0"),
    elapsed_days: parseInt($("#dias_decorridos").value||"0"),
    extension_days: parseInt($("#prorrogacao").value||"0"),
    remaining_days: parseInt($("#dias_restantes").value||"0"),
    summary: {},
    notes: $("#notes")?$("#notes").value:""
  };
  const collabRows=$$("#collabTable tbody tr").map(tr=>({
    id: crypto.randomUUID(),
    rdo_id: obj.id,
    collaborator_id: tr.dataset.collab||null,
    team_id: tr.querySelector(".teamSel").value||null,
    activity_id: tr.querySelector(".actSel").value||null,
    hours: parseFloat(tr.querySelector(".hoursInp").value||"0"),
    shift: tr.querySelector(".shiftSel").value||"day",
    status: tr.querySelector(".statusSel").value||"ok",
    status_note: tr.querySelector(".statusNote").value||null
  }));
  const equipRows=$$("#equipTable tbody tr").map(tr=>({
    id: crypto.randomUUID(),
    rdo_id: obj.id,
    equipment_id: tr.dataset.equip||null,
    start_meter: parseFloat(tr.querySelector(".startMeter").value||"0"),
    end_meter: parseFloat(tr.querySelector(".endMeter").value||"0"),
    hours: parseFloat(tr.querySelector(".equipHours").value||"0"),
    operator_id: tr.querySelector(".operatorSel").value||null,
  }));
  const occRows=$$("#occTable tbody tr").map(tr=>({
    id: crypto.randomUUID(),
    rdo_id: obj.id,
    category: tr.querySelector(".occCat").value||"other",
    description: tr.querySelector(".occDesc").value||"",
    affected_activity_id: tr.querySelector(".occAct").value||null,
    affected_team_id: tr.querySelector(".occTeam").value||null,
    lost_hours: parseFloat(tr.querySelector(".occLost").value||"0"),
    start_time: tr.querySelector(".occStart").value||null,
    end_time: tr.querySelector(".occEnd").value||null,
    severity: parseInt(tr.querySelector(".occSev").value||"0")
  }));
  if(navigator.onLine){
    const ok=await saveRdoOnline(obj,collabRows,equipRows,occRows);
    if(ok){ $("#rdo_id").value=obj.id; alert("RDO salvo!"); await refreshGallery(); await renderRdoList(); return; }
  }
  await queuePending({ type:"saveRDO", payload:{ obj, collabRows, equipRows, occRows } });
  await saveDraft({ id:obj.id, type:"rdo", data:{ obj, collabRows, equipRows, occRows } });
  alert("Sem conexão: RDO salvo localmente (fila de sincronização).");
}

async function saveRdoOnline(obj,collabRows,equipRows,occRows){
  try{
    const { error:e1 } = await supabaseClient.from("rdos").upsert([obj]);
    if(e1) throw e1;
    await supabaseClient.from("rdo_collaborator_entries").delete().eq("rdo_id", obj.id);
    await supabaseClient.from("rdo_equipment_entries").delete().eq("rdo_id", obj.id);
    await supabaseClient.from("rdo_occurrences").delete().eq("rdo_id", obj.id);
    if(collabRows.length){ const { error } = await supabaseClient.from("rdo_collaborator_entries").insert(collabRows); if(error) throw error; }
    if(equipRows.length){ const { error } = await supabaseClient.from("rdo_equipment_entries").insert(equipRows); if(error) throw error; }
    if(occRows.length){ const { error } = await supabaseClient.from("rdo_occurrences").insert(occRows); if(error) throw error; }
    return true;
  }catch(e){ console.error("saveRdoOnline",e); return false; }
}

async function attemptSync(){
  if(!navigator.onLine) return;
  const q=await getPending();
  for(const op of q){
    if(op.type==="saveRDO"){
      const { obj, collabRows, equipRows, occRows } = op.payload;
      const ok=await saveRdoOnline(obj,collabRows,equipRows,occRows);
      if(ok) await clearPending(op.id);
    }
  }
}

// ===== Uploads/Galeria =====
let currentRdoIdForGallery=null;
async function refreshGallery(){
  const rdoId=$("#rdo_id").value;
  const g=$("#gallery"); if(!g) return;
  if(!rdoId){ g.innerHTML=`<div class="muted">Salve o RDO para anexar arquivos.</div>`; return; }
  currentRdoIdForGallery=rdoId;
  const { data, error } = await supabaseClient.from("attachments").select("*").eq("rdo_id", rdoId).order("created_at",{ascending:false});
  if(error){ g.innerHTML=`<div class="text-red-600">${error.message}</div>`; return; }
  const bucket="attachments";
  const items=(data||[]).map(row=>{
    const { data:pub } = supabaseClient.storage.from(bucket).getPublicUrl(row.storage_path);
    const url=pub?.publicUrl||"#";
    const isImage=(row.mime||"").startsWith("image/");
    const isVideo=(row.mime||"").startsWith("video/");
    const media=isImage?`<img src="${url}" alt="">`:isVideo?`<video src="${url}" controls></video>`:`<div class="cap">Arquivo</div>`;
    const cap=(row.meta&&row.meta.caption)?row.meta.caption:(row.mime||"");
    return `<div class="thumb"><a href="${url}" target="_blank" rel="noreferrer">${media}</a>
      <div class="cap"><span>${cap}</span><button class="btn danger" onclick="deleteAttachment('${row.id}','${row.storage_path}')">Del</button></div></div>`;
  }).join("");
  g.innerHTML = items || `<div class="muted">Sem anexos ainda.</div>`;

  // Previews de assinaturas
  const sig = await supabaseClient.from("attachments").select("*").eq("rdo_id", rdoId).contains("meta", { kind:"signature" });
  if(!sig.error && sig.data){
    const bucket="attachments";
    for(const a of sig.data){
      const { data:pub } = supabaseClient.storage.from(bucket).getPublicUrl(a.storage_path);
      const url=pub?.publicUrl||null; if(!url) continue;
      if(a.meta?.role==="responsavel") $("#sign_responsavel_preview").src=url;
      if(a.meta?.role==="cliente") $("#sign_cliente_preview").src=url;
    }
  }
}

async function uploadFiles(){
  const rdoId=$("#rdo_id").value||null; if(!rdoId) return alert("Salve o RDO antes de anexar.");
  const fi=$("#fileInput"); if(!fi.files||!fi.files.length) return alert("Selecione arquivo(s).");
  const userId=sessionUser?.id; const today=new Date().toISOString().slice(0,10);
  for(const f of fi.files){
    const ext=(f.name.split(".").pop()||"").toLowerCase();
    const path=`${userId}/${rdoId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error:upErr } = await supabaseClient.storage.from("attachments").upload(path, f, { contentType:f.type });
    if(upErr){ alert("Falha upload: "+upErr.message); continue; }
    await supabaseClient.from("attachments").insert([{ rdo_id:rdoId, storage_path:path, mime:f.type, meta:{ caption:f.name, date:today } }]);
  }
  fi.value=""; await refreshGallery();
}

async function deleteAttachment(id,path){
  if(!confirm("Excluir este arquivo?")) return;
  await supabaseClient.storage.from("attachments").remove([path]);
  await supabaseClient.from("attachments").delete().eq("id", id);
  await refreshGallery();
}

// ===== Assinaturas =====
let signCtx=null, drawing=false, signRole=null;
function openSignModal(role){
  signRole=role;
  $("#signTitle").textContent = role==="responsavel" ? "Assinatura - Responsável" : "Assinatura - Cliente/Fiscal";
  $("#signModal").style.display="flex";
  const c=$("#signCanvas"); const ctx=c.getContext("2d");
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle="#111"; ctx.lineWidth=2; ctx.lineJoin="round"; ctx.lineCap="round";
  signCtx=ctx; bindSignEvents(c);
}
function closeSignModal(){ $("#signModal").style.display="none"; }
function clearSignature(){ const c=$("#signCanvas"); signCtx.fillStyle="#fff"; signCtx.fillRect(0,0,c.width,c.height); }
function bindSignEvents(canvas){
  const pos=e=>{ const r=canvas.getBoundingClientRect(); const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left; const y=(e.touches?e.touches[0].clientY:e.clientY)-r.top; return {x:x*(canvas.width/r.width), y:y*(canvas.height/r.height)}; };
  const start=e=>{ drawing=true; const p=pos(e); signCtx.beginPath(); signCtx.moveTo(p.x,p.y); };
  const move=e=>{ if(!drawing) return; const p=pos(e); signCtx.lineTo(p.x,p.y); signCtx.stroke(); };
  const end=()=>{ drawing=false; };
  canvas.onmousedown=start; canvas.onmousemove=move; window.onmouseup=end;
  canvas.ontouchstart=e=>{ e.preventDefault(); start(e); };
  canvas.ontouchmove=e=>{ e.preventDefault(); move(e); };
  canvas.ontouchend=e=>{ e.preventDefault(); end(e); };
}
async function saveSignature(){
  const rdoId=$("#rdo_id").value||null; if(!rdoId) return alert("Salve o RDO antes de assinar.");
  const c=$("#signCanvas");
  const blob=await new Promise(res=>c.toBlob(res,"image/png"));
  const file=new File([blob], `signature_${signRole}.png`, { type:"image/png" });
  const userId=sessionUser?.id; const path=`${userId}/${rdoId}/sign_${signRole}_${Date.now()}.png`;
  const { error:upErr } = await supabaseClient.storage.from("attachments").upload(path, file, { contentType:file.type });
  if(upErr) return alert("Falha ao salvar assinatura: "+upErr.message);
  await supabaseClient.from("attachments").insert([{ rdo_id:rdoId, storage_path:path, mime:file.type, meta:{ kind:"signature", role:signRole } }]);
  closeSignModal(); await refreshGallery();
}

// ===== PDF =====
async function generatePdf(){
  const { jsPDF } = window.jspdf; const doc=new jsPDF();
  const title=($("#brandName").textContent||"RDO")+" — RDO #"+($("#rdo_number").value||"");
  doc.text(title,10,12); doc.setFontSize(10);
  doc.text("Obra: "+($("#work_id").selectedOptions[0]?.text||""),10,20);
  doc.text("Data: "+($("#rdo_date").value||""),10,26);
  doc.text("Dia da semana: "+($("#weekday").value||""),10,32);
  doc.text("Efetivo diurno: "+($("#day_eff").value||"0"),10,38);
  doc.text("Efetivo noturno: "+($("#night_eff").value||"0"),10,44);
  doc.text("Resumo Clima (manhã): "+($("#weather_morning").value||""),10,52);
  doc.text("Ocorrências: ver sistema.",10,58);

  // Inserir assinaturas se houver
  try{
    const rdoId=document.getElementById("rdo_id").value||null;
    if(rdoId){
      const resp=await supabaseClient.from("attachments").select("*").eq("rdo_id",rdoId).contains("meta",{kind:"signature"});
      if(!resp.error && resp.data && resp.data.length){
        let y=66; doc.text("Assinaturas:",10,y); y+=6;
        for(const a of resp.data){
          const { data:pub } = supabaseClient.storage.from("attachments").getPublicUrl(a.storage_path);
          const url=pub?.publicUrl; if(!url) continue;
          const b=await fetch(url); const bl=await b.blob();
          const reader=new FileReader(); const dataUrl=await new Promise(r=>{ reader.onload=()=>r(reader.result); reader.readAsDataURL(bl); });
          doc.addImage(dataUrl,"PNG",12,y,60,18);
          doc.text(a.meta?.role==="responsavel"?"Responsável":"Cliente/Fiscal",76,y+10);
          y+=26;
        }
      }
    }
  }catch(e){}

  doc.save("RDO.pdf");
}

// ===== Helpers =====
function computeWeekday(s){ const d=new Date(s); return ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][d.getDay()]; }
function formatDate(d){ const dd=new Date(d); return dd.toLocaleDateString(); }
function tryParse(s){ try{ return JSON.parse(s);}catch{return s;} }

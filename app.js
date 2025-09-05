const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
let supabaseClient=null; let sessionUser=null;
let masterData={works:[],contractors:[],activities:[],collaborators:[],teams:[],equipment:[]};

document.addEventListener("DOMContentLoaded", async ()=>{
  const cfg=window.APP_CONFIG;
  supabaseClient=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);

  // SW só em HTTPS ou localhost
  if ("serviceWorker" in navigator) {
    const isSecure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (isSecure) navigator.serviceWorker.register("./sw.js");
  }

  // mobile nav
  $("#mobileNavBtn").addEventListener("click", ()=>$("#mobileNav").classList.toggle("hidden"));

  supabaseClient.auth.onAuthStateChange(async (_e,session)=>{ sessionUser=session?.user||null; updateAuthUI(); if(sessionUser){ await loadMasterData(); routeTo(location.hash||"#/rdos"); attemptSync(); } });
  const { data:{ session } } = await supabaseClient.auth.getSession();
  sessionUser=session?.user||null; updateAuthUI(); if(sessionUser){ await loadMasterData(); routeTo(location.hash||"#/rdos"); attemptSync(); }

  $("#registerForm")?.addEventListener("submit", registerUser);
  $("#loginForm")?.addEventListener("submit", loginUser);
  $("#logoutBtn")?.addEventListener("click", async()=>{ await supabaseClient.auth.signOut(); location.hash="#/rdos"; });

  $("#rdoForm")?.addEventListener("submit", saveRDO);
  $("#addCollabEntry")?.addEventListener("click", addCollabRow);
  $("#addEquipEntry")?.addEventListener("click", addEquipRow);
  $("#addOccEntry")?.addEventListener("click", addOccRow);
  $("#genPdfBtn")?.addEventListener("click", generatePdf);
  $("#prefillLastBtn")?.addEventListener("click", prefillFromLast);
  $("#fetchWeatherBtn")?.addEventListener("click", fetchWeatherIntoForm);
  $("#uploadBtn")?.addEventListener("click", uploadFiles);
  $("#nfcBtn")?.addEventListener("click", startNFCScan);

  window.addEventListener("online", attemptSync);
  window.addEventListener("hashchange", ()=>routeTo(location.hash));
});

function updateAuthUI(){
  if(sessionUser){ $("#authArea").classList.add("hidden"); $("#appArea").classList.remove("hidden"); $("#userEmail").textContent=sessionUser.email; }
  else{ $("#authArea").classList.remove("hidden"); $("#appArea").classList.add("hidden"); }
}
function applyActiveNav(route){
  ["navRdos","navNew","navMasters"].forEach(id=>$("#"+id)?.classList.remove("neutral"));
  if(route.startsWith("#/rdos")) $("#navRdos")?.classList.add("neutral");
  if(route.startsWith("#/rdo/new")) $("#navNew")?.classList.add("neutral");
  if(route.startsWith("#/cadastros")) $("#navMasters")?.classList.add("neutral");
}
function routeTo(hash){
  if(!sessionUser){ showPage("authArea"); return; }
  const h=hash||"#/rdos"; applyActiveNav(h);
  if(h==="#/rdos"){ showPage("page-list-rdo"); renderRdoList(1); }
  else if(h==="#/rdo/new"){ showPage("page-new-rdo"); initNewRdoForm(); }
  else if(h.startsWith("#/rdo/")){ const id=h.split("/")[2]; if(id) openRdo(id); else showPage("page-list-rdo"); }
  else if(h==="#/cadastros"){ showPage("page-masters"); renderCadastrosHome(); }
  else if(h.startsWith("#/cadastros/")){ showPage("page-masters"); renderCadastroSubpage(h.split("/")[2]); }
  else { showPage("page-list-rdo"); renderRdoList(1); }
}
function showPage(id){ $$(".page").forEach(p=>p.classList.add("hidden")); $("#"+id).classList.remove("hidden"); }

async function registerUser(e){ e.preventDefault();
  const name=$("#reg_name").value.trim(), email=$("#reg_email").value.trim(), phone=$("#reg_phone").value.trim(), password=$("#reg_pass").value;
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if(error) return alert("Erro no cadastro: "+error.message);
  await supabaseClient.from("profiles").insert([{ id:data.user.id, name, phone }]).catch(()=>{});
  alert("Cadastro criado!");
}
async function loginUser(e){ e.preventDefault();
  const email=$("#login_email").value.trim(), password=$("#login_pass").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if(error) alert("Login falhou: "+error.message);
}

// ===== Master data =====
async function loadMasterData(){
  const tables=["contractors","works","activities","collaborators","teams","equipment"];
  for(const t of tables){ const { data } = await supabaseClient.from(t).select("*").order("created_at",{ascending:false}); masterData[t]=data||[]; }
  fillSelect($("#work_id"), masterData.works, "id", "name");
  fillSelect($("#collabSel"), masterData.collaborators, "id", "name");
  fillSelect($("#equipSel"), masterData.equipment, "id", "name");
}
function fillSelect(sel, items, valKey, labelKey){
  if(!sel) return; sel.innerHTML = `<option value="">-- selecionar --</option>` + (items||[]).map(i=>`<option value="${i[valKey]}">${i[labelKey]}</option>`).join("");
}

// ===== RDO list + pagination =====
const RDO_PER_PAGE=10;
async function renderRdoList(page=1){
  const list=$("#rdoList"); const pag=$("#rdoPagination");
  const { count } = await supabaseClient.from("rdos").select("*",{count:"exact",head:true});
  const total=count||0, totalPages=Math.max(1,Math.ceil(total/RDO_PER_PAGE)); const current=Math.min(Math.max(1,page),totalPages);
  const { data, error } = await supabaseClient.from("rdos").select("id,rdo_number,rdo_date,weekday,works(name)").order("rdo_date",{ascending:false}).range((current-1)*RDO_PER_PAGE, current*RDO_PER_PAGE-1);
  if(error){ list.innerHTML=`<p class="muted">${error.message}</p>`; return; }
  list.innerHTML=(data||[]).map(r=>`
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap">
      <div>
        <div><strong>RDO #${r.rdo_number||""}</strong> — ${formatDate(r.rdo_date)} (${r.weekday||""})</div>
        <div class="muted">${r.works?.name||""}</div>
      </div>
      <div class="row"><a class="btn" href="#/rdo/${r.id}">Editar</a></div>
    </div>`).join("") || `<div class="muted">Nenhum RDO.</div>`;
  pag.innerHTML = `
    <button class="btn" ${current<=1?"disabled":""} id="rdoPrev">&larr; Anterior</button>
    <span class="muted">Página ${current} de ${totalPages} — ${total} RDO(s)</span>
    <button class="btn" ${current>=totalPages?"disabled":""} id="rdoNext">Próxima &rarr;</button>`;
  $("#rdoPrev")?.addEventListener("click", ()=>renderRdoList(current-1));
  $("#rdoNext")?.addEventListener("click", ()=>renderRdoList(current+1));
}

// ===== RDO form =====
function initNewRdoForm(){
  $("#rdo_id").value=""; $("#rdo_number").value=""; const d=new Date().toISOString().slice(0,10); $("#rdo_date").value=d; $("#weekday").value=computeWeekday(d);
  $$("#collabTable tbody, #equipTable tbody, #occTable tbody").forEach(t=>t.innerHTML="");
}
async function openRdo(id){
  const { data, error } = await supabaseClient.from("rdos").select("*").eq("id", id).single();
  if(error) return alert("Erro ao abrir RDO: "+error.message);
  $("#rdo_id").value=data.id; $("#work_id").value=data.work_id||""; $("#rdo_date").value=data.rdo_date||""; $("#rdo_number").value=data.rdo_number||""; $("#weekday").value=data.weekday||"";
  location.hash="#/rdo/"+id; await refreshGallery();
}
async function prefillFromLast(){
  const work_id=$("#work_id").value||null; let q=supabaseClient.from("rdos").select("*").order("rdo_date",{ascending:false}).limit(1); if(work_id) q=q.eq("work_id",work_id);
  const { data } = await q; if(data&&data[0]){ const last=data[0]; $("#weekday").value=computeWeekday($("#rdo_date").value||new Date().toISOString().slice(0,10)); $("#rdo_number").value=(last.rdo_number||0)+1; alert("Dados do último RDO aplicados."); } else alert("Não há RDO anterior.");
}

async function fetchWeatherIntoForm(){
  const cfg=window.APP_CONFIG; const work_id=$("#work_id").value; if(!work_id) return alert("Selecione a obra.");
  const work=masterData.works.find(w=>w.id===work_id); if(!work||!work.latitude||!work.longitude) return alert("Obra sem latitude/longitude.");
  let weather=null;
  try{
    if(cfg.USE_EDGE_WEATHER && cfg.WEATHER_FUNCTION_NAME){
      const { data, error } = await supabaseClient.functions.invoke(cfg.WEATHER_FUNCTION_NAME,{ body:{ lat:work.latitude, lon:work.longitude } }); if(error) throw error; weather=data;
    } else { const url=`https://api.open-meteo.com/v1/forecast?latitude=${work.latitude}&longitude=${work.longitude}&hourly=temperature_2m,precipitation,wind_speed_10m&timezone=auto`; const r=await fetch(url); weather=await r.json(); }
  }catch(e){ console.error(e); alert("Falha ao buscar clima."); return; }
  const r=summarizeWeather(weather); $("#weather_morning").value=JSON.stringify(r.morning); $("#weather_afternoon").value=JSON.stringify(r.afternoon); $("#weather_night").value=JSON.stringify(r.night);
}
function summarizeWeather(w){
  const hours=(w.hourly&&w.hourly.time)?w.hourly.time.map((t,i)=>({t, temp:w.hourly.temperature_2m[i], rain:w.hourly.precipitation[i], wind:w.hourly.wind_speed_10m[i]})):[];
  const seg={ morning:hours.filter(h=>{const H=+h.t.slice(11,13);return H>=6 && H<12;}), afternoon:hours.filter(h=>{const H=+h.t.slice(11,13);return H>=12 && H<18;}), night:hours.filter(h=>{const H=+h.t.slice(11,13);return H>=18 || H<6;}) };
  const agg=arr=>arr.length?{ temp_avg:+(arr.reduce((s,a)=>s+a.temp,0)/arr.length).toFixed(1), rain_sum:+arr.reduce((s,a)=>s+a.rain,0).toFixed(2), wind_avg:+(arr.reduce((s,a)=>s+a.wind,0)/arr.length).toFixed(1) }:{ temp_avg:null,rain_sum:null,wind_avg:null };
  return { morning:agg(seg.morning), afternoon:agg(seg.afternoon), night:agg(seg.night) };
}

async function saveRDO(e){
  e.preventDefault();
  const obj={ id: $("#rdo_id").value || crypto.randomUUID(), work_id: $("#work_id").value||null, rdo_number:+($("#rdo_number").value||"0"),
    rdo_date: $("#rdo_date").value||new Date().toISOString().slice(0,10), weekday: $("#weekday").value||computeWeekday($("#rdo_date").value||new Date().toISOString().slice(0,10)),
    weather_morning: tryParse($("#weather_morning").value), weather_afternoon: tryParse($("#weather_afternoon").value), weather_night: tryParse($("#weather_night").value),
    day_shift_effective:+($("#day_eff").value||"0"), night_shift_effective:+($("#night_eff").value||"0"),
    contractual_deadline_days:+($("#prazo_contratual").value||"0"), elapsed_days:+($("#dias_decorridos").value||"0"), extension_days:+($("#prorrogacao").value||"0"), remaining_days:+($("#dias_restantes").value||"0"), summary:{}, notes:"" };
  if(navigator.onLine){ const { error } = await supabaseClient.from("rdos").upsert([obj]); if(error){ alert(error.message); return; } $("#rdo_id").value=obj.id; alert("RDO salvo."); await refreshGallery(); renderRdoList(1); }
  else{ await queuePending({ type:"saveRDO", payload:{ obj } }); await saveDraft({ id:obj.id, type:"rdo", data:{ obj } }); alert("Sem conexão: salvo localmente."); }
}
async function attemptSync(){ if(!navigator.onLine) return; const q=await getPending(); for(const op of q){ if(op.type==="saveRDO"){ const { obj } = op.payload; const { error } = await supabaseClient.from("rdos").upsert([obj]); if(!error) await clearPending(op.id); } } }

// ===== Uploads / Galeria =====
async function refreshGallery(){
  const rdoId=$("#rdo_id").value; const g=$("#gallery"); if(!g) return;
  if(!rdoId){ g.innerHTML=`<div class="muted">Salve o RDO para anexar.</div>`; return; }
  const { data, error } = await supabaseClient.from("attachments").select("*").eq("rdo_id", rdoId).order("created_at",{ascending:false});
  if(error){ g.innerHTML=`<div class="muted">${error.message}</div>`; return; }
  const bucket="attachments";
  g.innerHTML=(data||[]).map(row=>{ const { data:pub } = supabaseClient.storage.from(bucket).getPublicUrl(row.storage_path); const url=pub?.publicUrl||"#"; const isImg=(row.mime||"").startsWith("image/"); const isVid=(row.mime||"").startsWith("video/"); const media=isImg?`<img src="${url}">`:isVid?`<video src="${url}" controls></video>`:`<div class="cap">Arquivo</div>`; const cap=(row.meta&&row.meta.caption)?row.meta.caption:(row.mime||""); return `<div class="thumb">${media}<div class="cap"><span>${cap}</span><button class="btn secondary" onclick="deleteAttachment('${row.id}','${row.storage_path}')">Del</button></div></div>`; }).join("")||`<div class="muted">Sem anexos.</div>`;
  const sig = await supabaseClient.from("attachments").select("*").eq("rdo_id", rdoId).contains("meta", { kind:"signature" });
  if(!sig.error && sig.data){ const bucket="attachments"; for(const a of sig.data){ const { data:pub } = supabaseClient.storage.from(bucket).getPublicUrl(a.storage_path); const url=pub?.publicUrl; if(!url) continue; if(a.meta?.role==="responsavel") $("#sign_responsavel_preview").src=url; if(a.meta?.role==="cliente") $("#sign_cliente_preview").src=url; } }
}
async function uploadFiles(){
  const rdoId=$("#rdo_id").value||null; if(!rdoId) return alert("Salve o RDO antes de anexar.");
  const fi=$("#fileInput"); if(!fi.files||!fi.files.length) return alert("Selecione arquivo(s)."); const userId=sessionUser?.id; const today=new Date().toISOString().slice(0,10);
  for(const f of fi.files){ const ext=(f.name.split(".").pop()||"").toLowerCase(); const path=`${userId}/${rdoId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`; const { error:upErr } = await supabaseClient.storage.from("attachments").upload(path, f, { contentType:f.type }); if(upErr){ alert("Upload falhou: "+upErr.message); continue; } await supabaseClient.from("attachments").insert([{ rdo_id:rdoId, storage_path:path, mime:f.type, meta:{ caption:f.name, date:today } }]); }
  fi.value=""; await refreshGallery();
}
async function deleteAttachment(id,path){ if(!confirm("Excluir este arquivo?")) return; await supabaseClient.storage.from("attachments").remove([path]); await supabaseClient.from("attachments").delete().eq("id", id); await refreshGallery(); }

// ===== Assinaturas =====
let signCtx=null, drawing=false, signRole=null;
function openSignModal(role){ signRole=role; $("#signTitle").textContent=role==="responsavel"?"Assinatura - Responsável":"Assinatura - Cliente/Fiscal"; $("#signModal").classList.remove("hidden"); const c=$("#signCanvas"); const ctx=c.getContext("2d"); ctx.fillStyle="#fff"; ctx.fillRect(0,0,c.width,c.height); ctx.strokeStyle="#111"; ctx.lineWidth=2; ctx.lineJoin="round"; ctx.lineCap="round"; signCtx=ctx; bindSignEvents(c); }
function closeSignModal(){ $("#signModal").classList.add("hidden"); }
function clearSignature(){ const c=$("#signCanvas"); signCtx.fillStyle="#fff"; signCtx.fillRect(0,0,c.width,c.height); }
function bindSignEvents(canvas){ const pos=e=>{const r=canvas.getBoundingClientRect(); const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left; const y=(e.touches?e.touches[0].clientY:e.clientY)-r.top; return {x:x*(canvas.width/r.width), y:y*(canvas.height/r.height)};}; const start=e=>{drawing=true; const p=pos(e); signCtx.beginPath(); signCtx.moveTo(p.x,p.y);}; const move=e=>{if(!drawing)return; const p=pos(e); signCtx.lineTo(p.x,p.y); signCtx.stroke();}; const end=()=>{drawing=false;}; canvas.onmousedown=start; canvas.onmousemove=move; window.onmouseup=end; canvas.ontouchstart=e=>{e.preventDefault(); start(e)}; canvas.ontouchmove=e=>{e.preventDefault(); move(e)}; canvas.ontouchend=e=>{e.preventDefault(); end(e)}; }
async function saveSignature(){ const rdoId=$("#rdo_id").value||null; if(!rdoId) return alert("Salve o RDO antes de assinar."); const c=$("#signCanvas"); const blob=await new Promise(res=>c.toBlob(res,"image/png")); const file=new File([blob], `signature_${signRole}.png`, { type:"image/png" }); const userId=sessionUser?.id; const path=`${userId}/${rdoId}/sign_${signRole}_${Date.now()}.png`; const { error:upErr } = await supabaseClient.storage.from("attachments").upload(path, file, { contentType:file.type }); if(upErr) return alert("Falha ao salvar assinatura: "+upErr.message); await supabaseClient.from("attachments").insert([{ rdo_id:rdoId, storage_path:path, mime:file.type, meta:{ kind:"signature", role:signRole } }]); closeSignModal(); await refreshGallery(); }

// ===== NFC =====
async function startNFCScan(){
  try{
    if(!window.APP_CONFIG.ENABLE_NFC) return alert("NFC está desativado na configuração.");
    if(!("NDEFReader" in window)) return alert("Web NFC não suportado neste dispositivo/navegador. Use Android + Chrome com HTTPS.");
    const reader = new NDEFReader();
    await reader.scan();
    $("#nfcHint").textContent = "Aproxime o crachá do dispositivo...";
    reader.onreading = async (event)=>{
      const recs = event.message.records || [];
      let payload = null;
      for(const r of recs){
        if(r.recordType === "text"){
          const textDecoder = new TextDecoder(r.encoding || "utf-8");
          payload = textDecoder.decode(r.data);
          break;
        }
        if(r.recordType === "mime" && r.mediaType==="text/plain"){
          payload = new TextDecoder().decode(r.data);
          break;
        }
      }
      if(!payload){ alert("Nenhum texto/ID encontrado na tag."); return; }
      handleBadgePayload(payload);
    };
  }catch(e){
    alert("NFC: "+(e.message||e));
  }
}
async function handleBadgePayload(payload){
  let idOrEmail = null;
  try{
    if(payload.trim().startsWith("{")){ const o=JSON.parse(payload); idOrEmail = o.id || o.email || null; }
    else { idOrEmail = payload.trim(); }
  }catch{ idOrEmail = payload.trim(); }
  if(!idOrEmail) return alert("Crachá sem dados válidos.");
  let q = supabaseClient.from("collaborators").select("*").limit(1);
  if(idOrEmail.includes("@")) q = q.eq("email", idOrEmail);
  else q = q.eq("id", idOrEmail);
  const { data, error } = await q;
  if(error){ alert(error.message); return; }
  let col = data && data[0];
  if(!col){
    if(confirm("Colaborador não encontrado. Deseja criar com base no crachá?")){
      const name = prompt("Nome do colaborador:");
      const payload = idOrEmail.includes("@") ? { name, email:idOrEmail } : { id:idOrEmail, name };
      const { data:ins, error:e2 } = await supabaseClient.from("collaborators").insert([payload]).select("*").single();
      if(e2){ alert(e2.message); return; }
      col = ins;
      await loadMasterData();
    }else{
      return;
    }
  }
  $("#collabSel").value = col.id;
  addCollabRow();
  $("#nfcHint").textContent = `Crachá lido: ${col.name || col.email || col.id}`;
}

// ===== Cadastros placeholder curto =====
function renderCadastrosHome(){ const vp=$("#cad-viewport"); vp.innerHTML=`<div class="card"><p class="muted">Escolha uma categoria.</p></div>`; }
function renderCadastroSubpage(kind){
  const vp=$("#cad-viewport");
  if(kind==="colaboradores"){
    vp.innerHTML=`
      <div class="card"><h3>Colaboradores</h3>
        <div class="grid grid-3">
          <input id="cl_name" placeholder="Nome">
          <input id="cl_role" placeholder="Função">
          <input id="cl_email" placeholder="Email">
          <input id="cl_phone" placeholder="Telefone">
          <button class="btn" id="btnSaveCol">Salvar</button>
        </div>
        <div class="row" style="flex-wrap:wrap;margin-top:.5rem">
          <input id="csvInput" type="file" accept=".csv">
          <button class="btn neutral" id="btnImportCsv">Importar CSV</button>
          <span class="muted">Formato: nome,funcao,email,telefone</span>
        </div>
      </div>
      <div class="card"><h4>Lista</h4><div id="listCollaborators"></div></div>`;
    $("#btnSaveCol").addEventListener("click", createColaborador);
    $("#btnImportCsv").addEventListener("click", importCsvColaboradores);
    renderList("collaborators","listCollaborators","name");
    return;
  }
  vp.innerHTML = `<div class="card"><p class="muted">Tela de "${kind}" — posso expandir esta tela aqui se você preferir.</p></div>`;
}

async function createColaborador(){ const payload={ name:$("#cl_name").value, role:$("#cl_role").value||null, email:$("#cl_email").value||null, phone:$("#cl_phone").value||null }; const { error } = await supabaseClient.from("collaborators").insert([payload]); if(error) return alert(error.message); alert("Colaborador salvo."); await loadMasterData(); renderList("collaborators","listCollaborators","name"); }
async function importCsvColaboradores(){ const fi=$("#csvInput"); if(!fi.files||!fi.files.length) return alert("Selecione um CSV."); const text=await fi.files[0].text(); const rows=text.split(/\\r?\\n/).map(l=>l.trim()).filter(Boolean); const payload=[]; for(const line of rows){ const [nome, funcao, email, telefone] = line.split(",").map(s=>s?.trim()||null); if(!nome) continue; payload.push({ name:nome, role:funcao||null, email:email||null, phone:telefone||null }); } if(!payload.length) return alert("CSV vazio."); const { error } = await supabaseClient.from("collaborators").insert(payload); if(error) return alert(error.message); alert(`Importados ${payload.length} colaboradores.`); await loadMasterData(); renderList("collaborators","listCollaborators","name"); }
async function renderList(table, targetId, labelKey){ const wrap=$("#"+targetId); const { data, error } = await supabaseClient.from(table).select("*").order("created_at",{ascending:false}); if(error){ wrap.innerHTML=`<div class="muted">${error.message}</div>`; return; } wrap.innerHTML=(data||[]).map(x=>`<div>${x[labelKey]||"(sem nome)"}</div>`).join("")||`<div class="muted">Sem registros.</div>`; }

// ===== Rows =====
function addCollabRow(){
  const sel=$("#collabSel"); const id=sel.value; if(!id) return alert("Selecione um colaborador.");
  const c = masterData.collaborators.find(x=>x.id===id);
  const tr=document.createElement("tr"); tr.dataset.collab=id;
  tr.innerHTML=`<td>${c?.name||"(?)"}</td>
    <td><select class="teamSel">${(masterData.teams||[]).map(t=>`<option value="${t.id}">${t.name}</option>`).join("")}</select></td>
    <td><select class="actSel">${(masterData.activities||[]).map(a=>`<option value="${a.id}">${a.name}</option>`).join("")}</select></td>
    <td><input class="hoursInp" type="number" step="0.25" value="1"></td>
    <td><select class="shiftSel"><option value="day">Dia</option><option value="night">Noite</option></select></td>
    <td><select class="statusSel"><option value="ok">OK</option><option value="absent">Faltou</option><option value="sick">Doente</option><option value="late">Atrasado</option><option value="changed_team">Mudou equipe</option><option value="other">Outros</option></select></td>
    <td><input class="statusNote"></td>
    <td><button class="btn secondary" type="button" onclick="this.closest('tr').remove()">Remover</button></td>`;
  $("#collabTable tbody").appendChild(tr);
}
function addEquipRow(){
  const sel=$("#equipSel"); const id=sel.value; if(!id) return alert("Selecione um equipamento.");
  const e = masterData.equipment.find(x=>x.id===id);
  const tr=document.createElement("tr"); tr.dataset.equip=id;
  tr.innerHTML=`<td>${e?.name||"(?)"}</td>
    <td><input class="startMeter" type="number" step="0.1"></td>
    <td><input class="endMeter" type="number" step="0.1"></td>
    <td><input class="equipHours" type="number" step="0.25" value="1"></td>
    <td><select class="operatorSel">${(masterData.collaborators||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join("")}</select></td>
    <td><button class="btn secondary" type="button" onclick="this.closest('tr').remove()">Remover</button></td>`;
  $("#equipTable tbody").appendChild(tr);
}
function addOccRow(){
  const tr=document.createElement("tr");
  tr.innerHTML=`<td><select class="occCat">
      <option value="climate">Clima</option><option value="materials">Materiais</option><option value="resources">Recursos</option>
      <option value="safety">Segurança</option><option value="impediment">Impedimento</option><option value="execution">Execução</option>
      <option value="strike">Greve</option><option value="lightning">Raio</option><option value="other">Outros</option>
    </select></td>
    <td><input class="occDesc"></td>
    <td><select class="occAct">${(masterData.activities||[]).map(a=>`<option value="${a.id}">${a.name}</option>`).join("")}</select></td>
    <td><select class="occTeam">${(masterData.teams||[]).map(t=>`<option value="${t.id}">${t.name}</option>`).join("")}</select></td>
    <td><input class="occLost" type="number" step="0.25" value="0"></td>
    <td><input class="occStart" type="time"></td>
    <td><input class="occEnd" type="time"></td>
    <td><input class="occSev" type="number" min="0" max="5" value="0" style="width:70px"></td>
    <td><button class="btn secondary" type="button" onclick="this.closest('tr').remove()">Remover</button></td>`;
  $("#occTable tbody").appendChild(tr);
}

// ===== PDF =====
async function generatePdf(){
  const { jsPDF } = window.jspdf; const doc=new jsPDF();
  const title="RDO — #"+($("#rdo_number").value||"");
  doc.text(title,10,12); doc.setFontSize(10);
  doc.text("Obra: "+($("#work_id").selectedOptions[0]?.text||""),10,20);
  doc.text("Data: "+($("#rdo_date").value||""),10,26);
  doc.text("Dia da semana: "+($("#weekday").value||""),10,32);
  doc.text("Efetivo diurno: "+($("#day_eff").value||"0"),10,38);
  doc.text("Efetivo noturno: "+($("#night_eff").value||"0"),10,44);
  doc.text("Resumo Clima (manhã): "+($("#weather_morning").value||""),10,52);
  doc.text("Ocorrências: ver sistema.",10,58);
  doc.save("RDO.pdf");
}

// ===== Helpers =====
function computeWeekday(s){ const d=new Date(s); return ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][d.getDay()]; }
function formatDate(d){ const dd=new Date(d); return dd.toLocaleDateString(); }
function tryParse(s){ try{ return JSON.parse(s);}catch{return s;} }

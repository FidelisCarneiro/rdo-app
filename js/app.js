/* Helpers */
const gid = id => document.getElementById(id);
const today = () => { const d=new Date(); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,"0"); const dd=String(d.getDate()).padStart(2,"0"); return y+"-"+m+"-"+dd; };
const toast = m => { const t = gid("toast"); t.textContent = m; t.style.display = "block"; setTimeout(()=>t.style.display="none",2400) };
const toHours = t => { if(!t) return 0; const [h,m] = t.split(":").map(Number); return (h||0)+((m||0)/60) };
const fmt1 = v => (Math.round((v||0)*10)/10).toString();

/* Searchable select (vanilla) */
function makeSearchableSelect(sel){
  if(!sel || sel.dataset.ss==="1") return;
  sel.dataset.ss = "1";
  const wrap = document.createElement("div"); wrap.className = "ss";
  const inp = document.createElement("input"); inp.type = "text"; inp.placeholder = "Pesquisar...";
  const ico = document.createElement("span"); ico.className = "ico"; ico.textContent = "⌄";
  const dd = document.createElement("div"); dd.className = "dd";
  const hidden = sel; hidden.style.display = "none";
  sel.parentNode.insertBefore(wrap, hidden);
  wrap.appendChild(inp); wrap.appendChild(ico); wrap.appendChild(dd); wrap.appendChild(hidden);
  function build(filter){
    dd.innerHTML = "";
    const f = (filter||"").trim().toLowerCase();
    Array.from(hidden.options).forEach(o=>{
      if(f && !o.text.toLowerCase().includes(f)) return;
      const d = document.createElement("div"); d.textContent = o.text; d.dataset.val = o.value; dd.appendChild(d);
    });
    dd.style.display = "block";
  }
  inp.addEventListener("focus",()=>build(inp.value));
  inp.addEventListener("input",()=>build(inp.value));
  inp.addEventListener("blur",()=>setTimeout(()=>dd.style.display="none",120));
  dd.addEventListener("mousedown",e=>{
    const it = e.target.closest("div"); if(!it) return;
    hidden.value = it.dataset.val; inp.value = it.textContent; dd.style.display = "none";
    hidden.dispatchEvent(new Event("change"));
  });
  const opt = hidden.options[hidden.selectedIndex]; if(opt){ inp.value = opt.text }
}

/* Nav */
document.getElementById("nav").addEventListener("click",(e)=>{
  if(!e.target.matches("a[data-tab]")) return;
  document.querySelectorAll("header nav a").forEach(a=>a.classList.remove("active"));
  e.target.classList.add("active");
  document.querySelectorAll("main > section").forEach(s=>s.style.display="none");
  const sel = e.target.dataset.tab;
  document.querySelector(sel).style.display = "block";
  if(sel==="#tab-dashboard") loadDashboard();
  if(sel==="#tab-rdos") loadRdoList();
  if(sel==="#tab-rdo") onOpenRdo();
  if(sel==="#tab-cad") onOpenCad();
});

/* Supabase */
const SUPABASE_URL = "https://iyizkskjjizqlcoakgrb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5aXprc2tqaml6cWxjb2FrZ3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NjI2NzYsImV4cCI6MjA3MjQzODY3Nn0.DJ-lFWRRtqWDNYu2NYbT-NOWaMy9jFJICBS4TsJveDA";
let sb;
function initSupabase(){ if(!window.supabase || !window.supabase.createClient){ console.error("Supabase SDK não carregou"); return } sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); onAuth(); }
if(window.supabase && window.supabase.createClient) initSupabase(); else window.addEventListener("load", initSupabase);

/* Auth */
document.getElementById("formSignIn").addEventListener("submit",async(e)=>{
  e.preventDefault(); if(!sb){ return alert("Aguarde o SDK..."); }
  const { error } = await sb.auth.signInWithPassword({ email: gid("inEmail").value, password: gid("inPass").value });
  if(error){ alert("Erro: "+error.message); return } onAuth();
});
document.getElementById("formSignUp").addEventListener("submit",async(e)=>{
  e.preventDefault(); if(!sb){ return alert("Aguarde o SDK..."); }
  const { data, error } = await sb.auth.signUp({ email: gid("upEmail").value, password: gid("upPass").value });
  if(error){ alert("Erro: "+error.message); return }
  if(data.user){ await sb.from("profiles").insert({ id:data.user.id, nome:gid("upNome").value, telefone:gid("upTel").value }); }
  alert("Conta criada! Faça login.");
});
async function onAuth(){
  if(!sb) return;
  const { data:{ user } } = await sb.auth.getUser();
  const ok = !!user;
  document.querySelectorAll("main > section").forEach(s=>s.style.display="none");
  document.querySelector(ok?"#tab-dashboard":"#tab-auth").style.display="block";
  document.querySelectorAll("header nav a").forEach(a=>a.classList.remove("active"));
  document.querySelector(`header nav a[data-tab='${ok?"#tab-dashboard":"#tab-auth"}']`).classList.add("active");
  if(ok){ await loadCombos(); await loadDashboard(); }
}

/* Combos gerais */
async function loadCombos(){
  if(!sb) return;
  const obras = (await sb.from("obras").select("id,nome").order("nome")).data||[];
  fillSel("filtroObra",obras,true); fillSel("rdoListObra",obras,true);
  fillSel("rdoObra",obras,false); fillSel("ativObra",obras,true);

  // Encarregados com equipe
  let encs = (await sb.from("encarregados_com_equipe").select("id,nome").order("nome")).data;
  if(!encs){
    const all = (await sb.from("colaboradores").select("id,nome")).data||[];
    const withTeam=[];
    for(const e of all){
      const c = await sb.from("colaboradores").select("id",{count:"exact",head:true}).eq("encarregado_id",e.id);
      if(c.count>0) withTeam.push(e);
    }
    encs = withTeam;
  }
  fillSel("filtroEnc",encs,true); fillSel("encSelect",encs,true); fillSel("colabEncarregado", encs, true);

  const colabs = (await sb.from("colaboradores").select("id,nome").order("nome")).data||[];
  fillSel("eqMotorista",colabs,true); fillSel("eqcMotorista",colabs,true); fillSel("extraColab", colabs, true);

  const atvs = (await sb.from("atividades").select("id,nome").order("nome")).data||[];
  fillSel("atvSelect",atvs,true);

  const eqs = (await sb.from("equipamentos").select("id,nome").order("nome")).data||[];
  fillSel("eqEquip",eqs,true);

  const mats = (await sb.from("materiais").select("id,nome,unidade").order("nome")).data||[];
  fillSel("matItem",mats,true);

  ["filtroObra","rdoListObra","rdoObra","ativObra","filtroEnc","encSelect","eqMotorista","colabEncarregado","eqcMotorista","atvSelect","eqEquip","matItem","extraColab"]
    .forEach(id=>makeSearchableSelect(gid(id)));
}
function fillSel(id,rows,addBlank){
  const s = gid(id); if(!s) return; const keep = s.value; s.innerHTML = "";
  if(addBlank) s.append(new Option("",""));
  (rows||[]).forEach(r=> s.append(new Option(r.nome||r.id, r.id)) );
  if(keep) s.value = keep;
}

/* Dashboard */
let CH = {};
gid("btnAplicarFiltros").addEventListener("click",loadDashboard);
async function loadDashboard(){
  if(!sb) return;
  const hoje=today();
  const ini = gid("filtroIni").value || hoje;
  const fim = gid("filtroFim").value || hoje;
  const obra = gid("filtroObra").value || null;
  const enc  = gid("filtroEnc").value || null;

  // HH por dia
  let qhh = sb.from("rdo_hh").select("horas, atividade_id, colaborador_id, rdo:data!inner(data, obra_id)").gte("data",ini).lte("data",fim);
  if(obra) qhh = qhh.eq("rdo.obra_id",obra);
  const hh = (await qhh).data||[];
  const mapHH = new Map(); hh.forEach(r=>{const d=r.rdo?.data; if(!d) return; mapHH.set(d,(mapHH.get(d)||0)+(r.horas||0))});
  draw("chHHporDia","line","HH por dia", seriesFromMap(mapHH));

  // Ocorrencias por tipo e por dia
  let qoc = sb.from("ocorrencias").select("tipo,data,obra_id").gte("data",ini).lte("data",fim);
  if(obra) qoc = qoc.eq("obra_id",obra);
  const occ = (await qoc).data||[];
  const aggTipo = {}; const mapODia=new Map();
  occ.forEach(o=>{ aggTipo[o.tipo]=(aggTipo[o.tipo]||0)+1; const d=o.data; mapODia.set(d,(mapODia.get(d)||0)+1); });
  draw("chOcorrTipo","doughnut","Ocorrências por tipo", seriesFromObj(aggTipo));
  draw("chOcorrDia","line","Ocorrências por dia", seriesFromMap(mapODia));

  // Status efetivo (rdo_colab_status)
  let qst = sb.from("rdo_colab_status").select("status,rdo:id!inner(data,obra_id)").gte("data",ini).lte("data",fim);
  if(obra) qst = qst.eq("rdo.obra_id",obra);
  const sts = (await qst).data||[];
  const aggSt = {}; sts.forEach(s=> aggSt[s.status]=(aggSt[s.status]||0)+1);
  draw("chStatusColab","pie","Status", seriesFromObj(aggSt));

  // HH por atividade (rdo_hh + atividades)
  let qha = sb.from("rdo_hh").select("horas, atividade_id, atividades(nome), rdo:data!inner(data,obra_id)").gte("data",ini).lte("data",fim);
  if(obra) qha = qha.eq("rdo.obra_id",obra);
  const ha = (await qha).data||[];
  const aggAtv={}; ha.forEach(a=>{ const n=a.atividades?.nome||a.atividade_id; aggAtv[n]=(aggAtv[n]||0)+(a.horas||0) });
  draw("chHHporAtividade","bar","HH por atividade", seriesFromObj(aggAtv));

  // Top colaboradores (HH)
  let qtc = sb.from("rdo_hh").select("horas, colaborador_id, colaboradores(nome), rdo:data!inner(data,obra_id)").gte("data",ini).lte("data",fim);
  if(obra) qtc = qtc.eq("rdo.obra_id",obra);
  const th = (await qtc).data||[];
  const aggCol={}; th.forEach(x=>{ const n=x.colaboradores?.nome||x.colaborador_id; aggCol[n]=(aggCol[n]||0)+(x.horas||0) });
  const top = Object.entries(aggCol).sort((a,b)=>b[1]-a[1]).slice(0,10);
  draw("chTopColab","bar","Top 10 colaboradores",{labels:top.map(x=>x[0]),data:top.map(x=>x[1])},{indexAxis:"y"});

  // Absenteismo por status (considerando não-presente)
  const abs = Object.entries(aggSt).filter(([k])=>k!=="presente");
  draw("chAbsenteismo","bar","Absenteismo",{labels:abs.map(x=>x[0]),data:abs.map(x=>x[1])});

  // Horas perdidas por motivo (ocorrencias_env)
  let qhp = sb.from("ocorrencias_env").select("prazo_impactado_h, ocorrencias:ocorrencia_id(tipo, data, obra_id)").gte("ocorrencias.data",ini).lte("ocorrencias.data",fim);
  if(obra) qhp = qhp.eq("ocorrencias.obra_id",obra);
  const hp = (await qhp).data||[];
  const aggLost={}; hp.forEach(r=>{ const t=r.ocorrencias?.tipo||"outros"; aggLost[t]=(aggLost[t]||0)+(r.prazo_impactado_h||0) });
  draw("chHorasPerdidas","bar","Horas perdidas",{labels:Object.keys(aggLost),data:Object.values(aggLost)});

  // Equipamentos (uso = fim - ini)
  let qeq = sb.from("rdo_equip").select("h_inicial,h_final,equipamento_id,equipamentos(nome), rdo:id!inner(data,obra_id)").gte("data",ini).lte("data",fim);
  if(obra) qeq = qeq.eq("rdo.obra_id",obra);
  const eq = (await qeq).data||[];
  const aggEq={}; eq.forEach(e=>{ const n=e.equipamentos?.nome||e.equipamento_id; const u=(e.h_final||0)-(e.h_inicial||0); aggEq[n]=(aggEq[n]||0)+u });
  draw("chEquip","bar","Uso de equipamentos",{labels:Object.keys(aggEq),data:Object.values(aggEq)});

  // Materiais (utilizado)
  let qmt = sb.from("rdo_materiais").select("acao,quantidade,material_id,materiais(nome), rdo:id!inner(data,obra_id)").gte("data",ini).lte("data",fim);
  if(obra) qmt = qmt.eq("rdo.obra_id",obra);
  const mt = (await qmt).data||[];
  const aggMat={}; mt.filter(m=>m.acao==="utilizado").forEach(m=>{ const n=m.materiais?.nome||m.material_id; aggMat[n]=(aggMat[n]||0)+(m.quantidade||0) });
  draw("chMateriais","bar","Materiais utilizados",{labels:Object.keys(aggMat),data:Object.values(aggMat)});

  // KPIs
  const totalHH = Array.from(mapHH.values()).reduce((a,b)=>a+b,0);
  gid("kpiHH").textContent = totalHH.toFixed(1);
  gid("kpiOcorr").textContent = occ.length;
  const rh = (await sb.from("rdo").select("id").eq("data",fim).limit(1000)).data||[];
  const ids = rh.map(x=>x.id);
  let efet = 0;
  if(ids.length){
    const pres = await sb.from("rdo_colab_status").select("colaborador_id,status").in("rdo_id",ids);
    efet = new Set((pres.data||[]).filter(x=>x.status==="presente").map(x=>x.colaborador_id)).size;
  }
  gid("kpiEfetivo").textContent = efet || "—";
}
function seriesFromMap(map){ if(!map || map.size===0){const d=today();return {labels:[d],data:[0]}} const labels=[...map.keys()].sort(); return {labels,data:labels.map(k=>map.get(k))} }
function seriesFromObj(o){ const ks=Object.keys(o||{}); if(!ks.length) return {labels:["—"],data:[0]}; return {labels:ks,data:ks.map(k=>o[k])} }
function draw(id,type,label,{labels,data},opts){
  const el = gid(id); if(!el) return;
  if(window.__CHARTS==null) window.__CHARTS={};
  if(window.__CHARTS[id]) window.__CHARTS[id].destroy();
  window.__CHARTS[id] = new Chart(el.getContext("2d"),{
    type,
    data:{ labels, datasets:[{ label, data }]},
    options:Object.assign({ responsive:true, maintainAspectRatio:false }, opts||{})
  });
}

/* Lista de RDOs */
gid("btnRdoList").addEventListener("click",loadRdoList);
async function loadRdoList(){
  if(!sb) return;
  const ini = gid("rdoListIni").value || today();
  const fim = gid("rdoListFim").value || today();
  const obra = gid("rdoListObra").value || null;
  let q = sb.from("rdo").select("id,numero,data,obra_id").gte("data",ini).lte("data",fim).order("data",{ascending:false});
  if(obra) q = q.eq("obra_id",obra);
  const r = (await q).data||[];
  const ids = r.map(x=>x.id);

  let hhSum = {};
  if(ids.length){
    const rs = await sb.from("rdo_hh").select("rdo_id,horas").in("rdo_id",ids);
    (rs.data||[]).forEach(h=> hhSum[h.rdo_id]=(hhSum[h.rdo_id]||0)+(h.horas||0));
  }
  let occCount = {};
  if(ids.length){
    const ro = await sb.from("ocorrencias").select("rdo_id").in("rdo_id",ids);
    (ro.data||[]).forEach(o=> occCount[o.rdo_id]=(occCount[o.rdo_id]||0)+1);
  }
  const tb = gid("tblRdos");
  tb.innerHTML = r.map(x=>`<tr data-id="${x.id}"><td>${x.numero||""}</td><td>${x.data||""}</td><td>${x.obra_id||""}</td><td>${(hhSum[x.id]||0).toFixed(1)}</td><td>${occCount[x.id]||0}</td></tr>`).join("");
  if(!tb._dblBound){
    tb.addEventListener("dblclick",(e)=>{
      const tr = e.target.closest("tr"); if(!tr) return;
      openRdoForEdit(tr.getAttribute("data-id"));
    });
    tb._dblBound = true;
  }
}

/* Novo RDO */
function onOpenRdo(){
  document.querySelectorAll("#rdoSteps a").forEach(a=> a.onclick=(e)=>{e.preventDefault(); document.querySelectorAll("#rdoSteps a").forEach(x=>x.classList.remove("active")); a.classList.add("active"); document.querySelector(a.getAttribute("href")).scrollIntoView({behavior:"smooth",block:"start"})});
  gid("rdoData").value = today(); setDow(today());
  gid("horaChegada").value = "08:00";
  gid("horaInicioTrab").value = "08:00";
  previewNextRdo();
  makeSearchableSelect(gid("rdoObra")); makeSearchableSelect(gid("encSelect")); makeSearchableSelect(gid("atvSelect"));

  // PTS chips
  document.querySelectorAll("#chipsPts .chip").forEach(c=> c.addEventListener("click",()=>{ document.querySelectorAll("#chipsPts .chip").forEach(x=>x.classList.remove("active")); c.classList.add("active"); setPts(c.dataset.v==="sim"); }));
  document.querySelector("#chipsPts .chip[data-v='nao']").classList.add("active"); setPts(false);
}
function setDow(val){ if(!val) return gid("rdoDow").textContent="—"; const d=new Date(val+"T00:00:00"); gid("rdoDow").textContent=d.toLocaleDateString("pt-BR",{weekday:"long"}) }
gid("rdoData").addEventListener("change",()=> setDow(gid("rdoData").value));
async function previewNextRdo(){ try{ const { data, error } = await sb.rpc("rdo_preview_next"); if(!error && data){ gid("rdoNumero").value = data; } }catch(e){ console.warn("preview next:", e); } }
function setPts(sim){ gid("ptsWrap").style.display = sim? "block":"none"; }

/* Presenças e NFC */
let equipe = [];
gid("encSelect").addEventListener("change", async ()=>{
  if(!sb) return;
  const enc = gid("encSelect").value;
  equipe = [];
  if(enc){
    let rs = (await sb.from("colaboradores").select("id,nome").eq("encarregado_id",enc).order("nome")).data||[];
    equipe = rs.map(c=>({ id:c.id, nome:c.nome, status:"presente", nfc:false, transfer_to:null }));
  }
  renderEquipe(); buildOccDistrib(); refreshExtraList();
});
function refreshExtraList(){ /* lista de todos já carregada nos combos; aqui filtraria se quiser */ }
function renderEquipe(){
  const host = gid("listaEquipe");
  if(!equipe.length){ host.innerHTML = '<div class="badge">Selecione um encarregado com equipe.</div>'; return; }
  host.innerHTML = equipe.map((c,i)=>`
    <div class="cardL">
      <div class="n"><b>${c.nome}</b></div>
      <div class="s">
        <select data-i="${i}" class="selStatus">
          <option value="presente"${c.status==='presente'?' selected':''}>Presente</option>
          <option value="ausente"${c.status==='ausente'?' selected':''}>Ausente</option>
          <option value="atrasado"${c.status==='atrasado'?' selected':''}>Atrasado</option>
          <option value="transferido"${c.status==='transferido'?' selected':''}>Transferido</option>
          <option value="demitido"${c.status==='demitido'?' selected':''}>Demitido</option>
          <option value="ferias"${c.status==='ferias'?' selected':''}>Férias</option>
          <option value="afastado"${c.status==='afastado'?' selected':''}>Afastado</option>
        </select>
      </div>
      <div class="a">
        <span class="status-chip ${statusClass(c.status)}">${c.status}</span>
        ${c.status==='transferido' ? transferSelectHtml(i) : ''}
      </div>
      <div class="h"><span class="badge">${c.status==='presente'?'08:00 previstas':''}</span></div>
      <div class="nfc"><span class="badge ${c.nfc?'st-presente':''}">${c.nfc?'NFC OK':'NFC'}</span></div>
    </div>
  `).join("");
  document.querySelectorAll(".transferSel").forEach(s=> makeSearchableSelect(s));
}
function statusClass(s){
  return s==='presente'?'st-presente':s==='ausente'?'st-ausente':s==='atrasado'?'st-atrasado':s==='transferido'?'st-transferido':s==='demitido'?'st-demitido':s==='ferias'?'st-ferias':'st-afastado';
}
function transferSelectHtml(i){
  // carrega encarregados nas options
  const encOps = Array.from(gid("encSelect").options).filter(o=>o.value).map(o=>`<option value="${o.value}">${o.text}</option>`).join("");
  return `<div style="margin-top:6px"><label style="font-size:12px">Para qual encarregado?</label><select class="transferSel" data-i="${i}">${encOps}</select></div>`;
}
document.addEventListener("change",(e)=>{
  if(e.target.classList.contains("selStatus")){
    const i = +e.target.getAttribute("data-i");
    equipe[i].status = e.target.value;
    renderEquipe(); buildOccDistrib();
  }
  if(e.target.classList.contains("transferSel")){
    const i = +e.target.getAttribute("data-i");
    equipe[i].transfer_to = e.target.value || null;
  }
});
let nfcOn = false;
gid("btnNFC").addEventListener("click",async()=>{
  if(!("NDEFReader" in window)){ gid("nfcStatus").textContent="NFC não suportado"; return }
  nfcOn = !nfcOn; gid("nfcStatus").textContent = nfcOn?"Lendo NFC...":"NFC desligado"; if(!nfcOn) return;
  try{
    const r = new NDEFReader(); await r.scan();
    r.onreading = async(ev)=>{
      const idHex = [...new Uint8Array(ev.serialNumber?hexToBytes(ev.serialNumber):[])].map(b=>b.toString(16).padStart(2,"0")).join("");
      gid("nfcStatus").textContent = "TAG "+idHex.slice(0,12)+"...";
      if(!sb) return;
      const q = await sb.from("colaboradores").select("id").eq("nfc_tag",idHex).limit(1);
      const cid = q.data?.[0]?.id;
      const ix = equipe.findIndex(x=>x.id===cid);
      if(ix>=0){ equipe[ix].status="presente"; equipe[ix].nfc=true; renderEquipe(); buildOccDistrib(); }
    };
  }catch(err){ gid("nfcStatus").textContent = "NFC erro: "+err.message }
});
function hexToBytes(hex){ const a=[]; for(let c=0;c<hex.length;c+=2) a.push(parseInt(hex.substr(c,2),16)); return new Uint8Array(a) }

/* Atividades do dia */
let atividades = [];
gid("btnAddAtv").addEventListener("click",()=>{
  const aSel = gid("atvSelect"); if(!aSel.value){ alert("Selecione a atividade"); return }
  const prazo = gid("atvPrazo").value || "08:00";
  const item = { id: crypto.randomUUID(), atividade_id:aSel.value, nome:aSel.options[aSel.selectedIndex].text, prazo, hh:{}, files: gid("atvFotos").files };
  atividades.push(item);
  renderAtividades();
  gid("atvFotos").value="";
});
function presentes(){ return equipe.filter(e=>e.status==="presente") }
function renderAtividades(){
  const w = gid("wrapAtividades");
  w.innerHTML = atividades.map((a,ai)=>{
    const rows = presentes().map(p=>{
      const v = a.hh[p.id]||"08:00";
      return `<tr><td>${p.nome}</td><td><input type="time" step="60" value="${v}" data-ai="${ai}" data-cid="${p.id}" class="inHH"></td></tr>`;
    }).join("");
    return `<div class="card"><b>${a.nome}</b> — prazo ${a.prazo}
      <div class="row" style="margin-top:6px"><button class="btn ghost" data-ai="${ai}" data-aplicar>Aplicar prazo a todos</button></div>
      <table style="margin-top:6px"><thead><tr><th>Colaborador</th><th>HH</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }).join("");
}
document.addEventListener("input",(e)=>{
  if(e.target.classList.contains("inHH")){
    const ai = +e.target.getAttribute("data-ai");
    const cid = e.target.getAttribute("data-cid");
    atividades[ai].hh[cid] = e.target.value;
  }
});
document.addEventListener("click",(e)=>{
  if(e.target.hasAttribute("data-aplicar")){
    const ai = +e.target.getAttribute("data-ai");
    const prazo = atividades[ai].prazo;
    presentes().forEach(p=> atividades[ai].hh[p.id]=prazo );
    renderAtividades();
  }
});

/* Ocorrências */
const ocorrs = [];
function buildOccDistrib(){
  const tb = gid("occTBody");
  tb.innerHTML = presentes().map(p=>{
    return `<tr><td>${p.nome}</td><td><input type="time" step="60" value="08:00" class="occInp" data-cid="${p.id}"></td></tr>`;
  }).join("");
}
gid("btnOccAll").addEventListener("click",()=>{
  const v = gid("occAll").value || "08:00";
  document.querySelectorAll(".occInp").forEach(i=> i.value=v);
});
gid("btnAddOcc").addEventListener("click",()=>{
  const tipo = gid("occTipo").value;
  const desc = (gid("occDesc").value||"").trim();
  if(!desc){ alert("Descreva a ocorrência"); return }
  const impact = {};
  document.querySelectorAll(".occInp").forEach(i=> impact[i.dataset.cid]=i.value||"00:00");
  ocorrs.push({ tipo, desc, files: gid("occFoto").files, impact });
  gid("occFoto").value=""; gid("occDesc").value="";
  gid("occLista").innerHTML = ocorrs.map((o,i)=>`<li>#${i+1} ${o.tipo} - ${o.desc}</li>`).join("");
});

/* Clima */
gid("btnClima").addEventListener("click",async()=>{
  const date = gid("rdoData").value || today();
  try{
    const pos = await new Promise((res,rej)=> navigator.geolocation.getCurrentPosition(res,rej));
    const lat = pos.coords.latitude.toFixed(4), lon = pos.coords.longitude.toFixed(4);
    const inmet = await tryInmet(lat,lon,date);
    if(inmet){ renderClimaCards(inmet.cards, "INMET (observado)", "https://apitempo.inmet.gov.br"); return; }
    const om = await openMeteo(lat,lon,date);
    renderClimaCards(om.cards, "Open-Meteo (previsão/histórico)", "https://open-meteo.com/");
  }catch(err){ alert("Ative a localização para buscar clima automaticamente."); }
});
async function tryInmet(lat,lon,date){
  try{
    const estacoes = await fetch("https://apitempo.inmet.gov.br/estacoes/").then(r=>r.json()).catch(()=>null);
    if(!Array.isArray(estacoes) || !estacoes.length) return null;
    let best=null, bestd=1e9;
    for(const e of estacoes){
      if(!e.latitude || !e.longitude) continue;
      const d = Math.hypot(parseFloat(e.latitude)-lat, parseFloat(e.longitude)-lon);
      if(d<bestd){ best=e; bestd=d; }
    }
    if(!best || !best.codigo) return null;
    const dados = await fetch(`https://apitempo.inmet.gov.br/estacao/dados/${best.codigo}/${date}`).then(r=>r.json()).catch(()=>null);
    if(!Array.isArray(dados) || !dados.length) return null;
    const num = (v)=> v==null? null : Number(String(v).replace(",","."));
    const pick = (k)=> dados.map(x=> num(x[k])).filter(x=>typeof x==="number");
    const avg = (a)=> a.length? a.reduce((s,v)=>s+v,0)/a.length : 0;
    const sum = (a)=> a.length? a.reduce((s,v)=>s+v,0) : 0;
    const min = (a)=> a.length? Math.min(...a) : 0;
    const max = (a)=> a.length? Math.max(...a) : 0;
    const cards = [
      {t:"Temperatura média (°C)",v:avg(pick("TEM_INS"))},
      {t:"Temperatura min (°C)",v:min(pick("TEM_INS"))},
      {t:"Temperatura max (°C)",v:max(pick("TEM_INS"))},
      {t:"Sensação (°C)",v:avg(pick("SEN_INS"))},
      {t:"Umidade (%)",v:avg(pick("UMD_INS"))},
      {t:"Ponto de orvalho (°C)",v:avg(pick("PTO_INS"))},
      {t:"Pressão (hPa)",v:avg(pick("PRE_INS"))},
      {t:"Vento (m/s)",v:avg(pick("VEN_VEL"))},
      {t:"Rajadas (m/s)",v:avg(pick("VEN_RAJ"))},
      {t:"Precipitação (mm)",v:sum(pick("CHUVA"))}
    ];
    return { cards };
  }catch(e){ console.warn("INMET fail", e); return null; }
}
async function openMeteo(lat,lon,date){
  const url = "https://api.open-meteo.com/v1/forecast?latitude="+lat+"&longitude="+lon+"&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,pressure_msl,cloud_cover,precipitation,wind_speed_10m,wind_gusts_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&start_date="+date+"&end_date="+date;
  const js = await (await fetch(url)).json();
  const H = js.hourly||{};
  const D = js.daily||{};
  const avg = (a)=>{ if(!a||!a.length) return 0; let s=0,c=0; for(let i=0;i<a.length;i++){ if(a[i]==null) continue; s+=a[i]; c++ } return c?s/c:0 };
  const sum = (a)=>{ if(!a||!a.length) return 0; let s=0; for(let i=0;i<a.length;i++){ if(a[i]==null) continue; s+=a[i] } return s };
  const cards = [
    {t:"Temperatura média (°C)",v:avg(H.temperature_2m)},
    {t:"Temperatura min (°C)",v:(D.temperature_2m_min||[0])[0]||0},
    {t:"Temperatura max (°C)",v:(D.temperature_2m_max||[0])[0]||0},
    {t:"Sensação (°C)",v:avg(H.apparent_temperature)},
    {t:"Umidade (%)",v:avg(H.relative_humidity_2m)},
    {t:"Ponto de orvalho (°C)",v:avg(H.dew_point_2m)},
    {t:"Pressão (hPa)",v:avg(H.pressure_msl)},
    {t:"Nuvens (%)",v:avg(H.cloud_cover)},
    {t:"Precipitação (mm)",v:sum(H.precipitation)},
    {t:"Vento (m/s)",v:avg(H.wind_speed_10m)},
    {t:"Rajadas (m/s)",v:avg(H.wind_gusts_10m)}
  ];
  return { cards };
}
function renderClimaCards(cards, fonteLabel, fonteUrl){
  const box = gid("climaCards");
  box.innerHTML = cards.map(c=>`<div class="card"><div>${c.t}</div><div><b>${fmt1(c.v)}</b></div></div>`).join("")
    + `<div class="badge" style="grid-column:1/-1">Fonte: <a href="${fonteUrl}" target="_blank" rel="noopener">${fonteLabel}</a></div>`;
}

/* Imprimir */
gid("btnImprimir").addEventListener("click",()=> window.print());

/* Salvar RDO */
gid("btnSalvarRDO").addEventListener("click",async()=>{
  if(!sb){ return alert("Aguarde o SDK...") }
  const obra_id = gid("rdoObra").value; if(!obra_id){ alert("Selecione a obra"); return }
  const data = gid("rdoData").value || today();
  const teve_pts = document.querySelector("#chipsPts .chip.active")?.dataset.v === "sim";
  if(!gid("horaChegada").value){ alert("Informe a Hora de chegada ao campo"); return }
  if(teve_pts){
    if(!(gid("ptsNumero").value||"").trim() || !(gid("ptsAbertura").value||"").trim() || !(gid("ptsDesc").value||"").trim()){
      alert("Preencha Nº PTS, Hora de abertura e Descrição da atividade PTS.");
      return;
    }
    if(!(gid("ptsFoto").files?.length)){ alert("Anexe pelo menos uma foto da PTS"); return }
  }
  const row = {
    obra_id, numero: null, data,
    hora_chegada: gid("horaChegada").value || "08:00",
    inicio_trabalho: gid("horaInicioTrab").value || "08:00",
    clima_manha: gid("climaManha").value || null,
    clima_tarde: gid("climaTarde").value || null,
    clima_noite: gid("climaNoite").value || null,
    teve_pts, pts_numero: teve_pts? (gid("ptsNumero").value || null) : null,
    pts_abertura: teve_pts? (gid("ptsAbertura").value || null) : null,
    pts_desc: teve_pts? (gid("ptsDesc").value || null) : null,
    resumo: (gid("rdoResumo").value||"").trim()
  };

  const ins = await sb.from("rdo").insert(row).select("id,numero");
  if(ins.error){ alert("Erro ao salvar RDO: "+ins.error.message); return }
  const rdo_id = ins.data?.[0]?.id;
  const numero  = ins.data?.[0]?.numero || gid("rdoNumero").value || "00000001";

  // Status dos colaboradores (presenças)
  if(equipe.length){
    const st = equipe.map(c=>({ rdo_id, colaborador_id:c.id, status:c.status, transfer_to:c.transfer_to || null }));
    await sb.from("rdo_colab_status").insert(st).catch(()=>{});
  }

  // Atividades e HH + upload de fotos de atividade
  for(const a of atividades){
    const ia = await sb.from("rdo_atividades").insert({ rdo_id, atividade_id:a.atividade_id, prazo_dia_h: toHours(a.prazo) }).select("id");
    if(ia.error) continue;
    const rid = ia.data?.[0]?.id;
    if(rid){
      const rows = [];
      Object.keys(a.hh).forEach(cid=>{
        const hh = a.hh[cid];
        if(hh) rows.push({ rdo_id, atividade_id:a.atividade_id, colaborador_id:cid, horas: toHours(hh) });
      });
      if(rows.length) await sb.from("rdo_hh").insert(rows).catch(()=>{});
      await uploadFiles(a.files, "rdo/"+numero+"/ATV/", (i,f)=>"RDO"+numero+"_ATV_"+slug(a.nome)+"_"+String(i+1).padStart(4,"0")+"."+ext(f.name));
    }
  }

  // Ocorrências globais + impactos por colaborador + fotos
  for(const o of ocorrs){
    const io = await sb.from("ocorrencias").insert({ rdo_id, obra_id, tipo:o.tipo, descricao:o.desc, data }).select("id");
    if(io.error) continue;
    const oid = io.data?.[0]?.id;
    if(oid){
      const rows = Object.entries(o.impact).map(([cid,hh])=>({ ocorrencia_id:oid, colaborador_id:cid, prazo_impactado_h: toHours(hh) }));
      if(rows.length) await sb.from("ocorrencias_env").insert(rows).catch(()=>{});
      await uploadFiles(o.files, "rdo/"+numero+"/OCO/", (i,f)=>"RDO"+numero+"_OCO_"+o.tipo+"_"+String(i+1).padStart(4,"0")+"."+ext(f.name));
    }
  }

  // Equipamentos
  if(eqRows.length){
    await sb.from("rdo_equip").insert(eqRows.map(e=>({
      rdo_id, equipamento_id:e.equipamento_id, motorista_id:e.motorista_id,
      h_inicial:e.h_ini, h_final:e.h_fim
    }))).catch(()=>{});
  }

  // Materiais
  if(matRows.length){
    await sb.from("rdo_materiais").insert(matRows.map(m=>({
      rdo_id, material_id:m.material_id, acao:m.acao, quantidade:m.qtde, unidade:m.unid
    }))).catch(()=>{});
  }

  // Fotos PTS
  if(teve_pts && gid("ptsFoto").files?.length){
    await uploadFiles(gid("ptsFoto").files, "rdo/"+numero+"/PTS/", (i,f)=>"RDO"+numero+"_PTS_"+String(i+1).padStart(4,"0")+"."+ext(f.name));
  }
  // Fotos Observações
  if(gid("obsFotos").files?.length){
    await uploadFiles(gid("obsFotos").files, "rdo/"+numero+"/OBS/", (i,f)=>"RDO"+numero+"_OBS_"+String(i+1).padStart(4,"0")+"."+ext(f.name));
  }

  toast("RDO salvo com sucesso");
  document.querySelector("header nav a[data-tab='#tab-dashboard']").click();
  await loadDashboard();
});
async function uploadFiles(files, basePath, namer){
  if(!files||!files.length || !sb) return;
  for(let i=0;i<files.length;i++){
    const f = files[i];
    const path = basePath + namer(i,f);
    const { error } = await sb.storage.from("rdo_fotos").upload(path, f, { upsert:false });
    if(error){ console.warn("upload", path, error.message) }
  }
}
function ext(n){ const p=n.split("."); return (p.length>1?p.pop():"jpg").toLowerCase() }
function slug(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"") || "atividade" }

/* Edição RDO (abrir) */
async function openRdoForEdit(id){
  if(!sb) return;
  const r = (await sb.from("rdo").select("*").eq("id",id).single()).data;
  if(!r){ alert("RDO não encontrado"); return }
  document.querySelector("header nav a[data-tab='#tab-rdo']").click();
  gid("rdoObra").value = r.obra_id;
  gid("rdoNumero").value = r.numero;
  gid("rdoData").value = r.data;
  setDow(r.data);
  gid("horaChegada").value = r.hora_chegada||"08:00";
  gid("horaInicioTrab").value = r.inicio_trabalho||"08:00";
  ["climaManha","climaTarde","climaNoite"].forEach(k=> gid(k).value = r[k]||"");
  const sim = !!r.teve_pts;
  setPts(sim);
  if(sim){
    gid("ptsNumero").value = r.pts_numero||"";
    gid("ptsAbertura").value = r.pts_abertura||"";
    gid("ptsDesc").value = r.pts_desc||"";
  }
}

/* Equipamentos & Materiais (sessão) */
const eqRows = []; const matRows = [];
gid("btnAddEq").addEventListener("click",()=>{
  const eqSel = gid("eqEquip"); if(!eqSel.value){ alert("Selecione equipamento"); return }
  const mot = gid("eqMotorista");
  const row = {
    equipamento_id:eqSel.value,
    equipamento_nome:eqSel.options[eqSel.selectedIndex].text,
    motorista_id:mot.value||null,
    motorista_nome:mot.value?mot.options[mot.selectedIndex].text:"",
    h_ini:Number(gid("eqHini").value||0),
    h_fim:Number(gid("eqHfim").value||0)
  };
  eqRows.push(row); renderEq();
});
function renderEq(){
  const tb = gid("tblEq");
  tb.innerHTML = eqRows.map((r,i)=>`<tr><td>${r.equipamento_nome}</td><td>${r.motorista_nome||"—"}</td><td>${r.h_ini}</td><td>${r.h_fim}</td><td><button class="btn ghost" data-del-eqi="${i}">X</button></td></tr>`).join("");
}
document.addEventListener("click",(e)=>{
  const i = e.target.getAttribute("data-del-eqi");
  if(i!=null){ eqRows.splice(+i,1); renderEq() }
});
gid("btnAddMat").addEventListener("click",()=>{
  const m = gid("matItem"); if(!m.value){ alert("Selecione material"); return }
  const row = {
    material_id:m.value, material_nome:m.options[m.selectedIndex].text,
    acao:gid("matAcao").value, qtde:Number(gid("matQtde").value||0), unid:gid("matUnid").value||""
  };
  matRows.push(row); renderMat();
});
function renderMat(){
  const tb = gid("tblMat");
  tb.innerHTML = matRows.map((r,i)=>`<tr><td>${r.material_nome}</td><td>${r.acao}</td><td>${r.qtde}</td><td>${r.unid}</td><td><button class="btn ghost" data-del-mati="${i}">X</button></td></tr>`).join("");
}
document.addEventListener("click",(e)=>{
  const i = e.target.getAttribute("data-del-mati");
  if(i!=null){ matRows.splice(+i,1); renderMat() }
});

/* Cadastros (CRUD) */
document.querySelectorAll(".cad-btn").forEach(b=> b.addEventListener("click",()=>{
  document.querySelectorAll(".cad-btn").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");
  ["cad-obras","cad-colab","cad-ativ","cad-eq","cad-mat"].forEach(id=> gid(id).style.display="none");
  gid(b.dataset.cad.slice(1)).style.display = "block";
}));

async function onOpenCad(){
  ["cad-obras","cad-colab","cad-ativ","cad-eq","cad-mat"].forEach(id=> gid(id).style.display="none");
  gid("cad-obras").style.display="block";
  await loadCrud();
}
async function loadCrud(){
  if(!sb) return;

  // Obras
  await refreshObras();
  gid("qObras").oninput = refreshObras;
  gid("btnNewObra").onclick = ()=>{ toggle("formObra"); };
  gid("btnAddObra").onclick = saveObra;

  // Colaboradores
  await refreshColab();
  gid("qColab").oninput = refreshColab;
  gid("btnNewColab").onclick = ()=>{ toggle("formColab"); };
  gid("btnAddColab").onclick = saveColab;

  // Atividades
  await refreshAtiv();
  gid("qAtiv").oninput = refreshAtiv;
  gid("btnNewAtiv").onclick = ()=>{ toggle("formAtiv"); };
  gid("btnAddAtiv").onclick = saveAtiv;

  // Equip
  await refreshEquip();
  gid("qEquip").oninput = refreshEquip;
  gid("btnNewEquip").onclick = ()=>{ toggle("formEquip"); };
  gid("btnAddEquip").onclick = saveEquip;

  // Materiais
  await refreshMat();
  gid("qMat").oninput = refreshMat;
  gid("btnNewMat").onclick = ()=>{ toggle("formMat"); };
  gid("btnAddMatSave").onclick = saveMat;

  bindDbl("listaObras", startEditObra);
  bindDbl("listaColabs", startEditColab);
  bindDbl("listaAtivs", startEditAtiv);
  bindDbl("listaEquip", startEditEquip);
  bindDbl("listaMat", startEditMat);
}
function toggle(id){ const el=gid(id); el.style.display = el.style.display==="none" ? "block":"none" }
function bindDbl(tid,fn){ const tb = gid(tid); if(tb && !tb._dbl){ tb.addEventListener("dblclick",(e)=>{ const tr = e.target.closest("tr"); if(tr) fn(tr.getAttribute("data-id")) }); tb._dbl=true; } }

/* Obras CRUD */
async function refreshObras(){
  const f = (gid("qObras").value||"").trim();
  let q = sb.from("obras").select("id,nome,gestor,escopo").order("nome");
  if(f) q = q.ilike("nome", "%"+f+"%");
  const obras = (await q).data||[];
  gid("listaObras").innerHTML = obras.map(o=>`<tr data-id="${o.id}"><td>${o.nome}</td><td>${o.gestor||"—"}</td><td>${o.escopo||"—"}</td></tr>`).join("");
}
async function startEditObra(id){
  const r = (await sb.from("obras").select("*").eq("id",id).single()).data;
  gid("formObra").style.display="block"; gid("formObra").dataset.id=id;
  gid("obraNome").value=r.nome||""; gid("obraGestor").value=r.gestor||""; gid("obraEscopo").value=r.escopo||"";
  gid("obraContrato").value=r.numero_contrato||""; gid("obraInicio").value=r.data_inicio||"";
  gid("obraAssin").value=r.data_assinatura||""; gid("obraPrev").value=r.previsao_conclusao||"";
  gid("obraValor").value=r.valor||""; gid("obraResp").value=r.responsavel_tecnico||""; gid("obraART").value=r.numero_art||"";
  gid("btnAddObra").textContent="Atualizar";
}
async function saveObra(){
  const uniq = await sb.from("obras").select("id", { count:"exact", head:true }).ilike("nome", gid("obraNome").value);
  if(uniq.count>0 && !gid("formObra").dataset.id){ alert("Obra já cadastrada."); return; }
  const row={ nome:gid("obraNome").value, gestor:gid("obraGestor").value, escopo:gid("obraEscopo").value,
    numero_contrato:gid("obraContrato").value, data_inicio:gid("obraInicio").value||null, data_assinatura:gid("obraAssin").value||null,
    previsao_conclusao:gid("obraPrev").value||null, valor:Number(gid("obraValor").value||0), responsavel_tecnico:gid("obraResp").value, numero_art:gid("obraART").value };
  const id = gid("formObra").dataset.id;
  if(id){ await sb.from("obras").update(row).eq("id",id) } else { await sb.from("obras").insert(row) }
  gid("formObra").dataset.id=""; gid("btnAddObra").textContent="Salvar"; toast("Obra salva"); refreshObras(); loadCombos();
}

/* Colaboradores CRUD */
async function refreshColab(){
  const f = (gid("qColab").value||"").trim();
  let q = sb.from("colaboradores").select("id,matricula,nome,funcao,local,encarregado_id,situacao,tipo,nfc_tag").order("nome");
  if(f){ q = q.or(`nome.ilike.%${f}%,matricula.ilike.%${f}%,funcao.ilike.%${f}%`); }
  const encMap = {}; (await sb.from("colaboradores").select("id,nome")).data?.forEach(e=> encMap[e.id]=e.nome);
  const col = (await q).data||[];
  gid("listaColabs").innerHTML = col.map(c=>`<tr data-id="${c.id}"><td>${c.matricula||""}</td><td>${c.nome}</td><td>${c.funcao||""}</td><td>${c.local||""}</td><td>${encMap[c.encarregado_id]||"—"}</td><td>${c.situacao||""}</td><td>${c.tipo||""}</td><td>${c.nfc_tag?c.nfc_tag.slice(0,8)+"…":"—"}</td></tr>`).join("");
}
async function startEditColab(id){
  const r = (await sb.from("colaboradores").select("*").eq("id",id).single()).data;
  gid("formColab").style.display="block"; gid("formColab").dataset.id=id; gid("btnAddColab").textContent="Atualizar";
  gid("colMatricula").value=r.matricula||""; gid("colabNome").value=r.nome||""; gid("colabFuncao").value=r.funcao||"";
  gid("colabLocal").value=r.local||""; gid("colabEncarregado").value=r.encarregado_id||"";
  gid("colabSituacao").value=r.situacao||"ativo"; gid("colabTipo").value=r.tipo||"";
  gid("colabTel").value=r.telefone||""; gid("colabEmail").value=r.email||""; gid("colabAdmissao").value=r.admissao||"";
  gid("colabNFC").value=r.nfc_tag||"";
  makeSearchableSelect(gid("colabEncarregado"));
}
async function saveColab(){
  const mat = gid("colMatricula").value;
  if(!mat){ alert("Matrícula é obrigatória."); return; }
  if(!gid("formColab").dataset.id){
    const exists = await sb.from("colaboradores").select("id", { count:"exact", head:true }).eq("matricula", mat);
    if(exists.count>0){ alert("Matrícula já cadastrada."); return; }
  }
  const row={ matricula:mat, nome:gid("colabNome").value, funcao:gid("colabFuncao").value, local:gid("colabLocal").value,
    encarregado_id:gid("colabEncarregado").value||null, situacao:gid("colabSituacao").value||"ativo", tipo:gid("colabTipo").value||null,
    telefone:gid("colabTel").value||null, email:gid("colabEmail").value||null, admissao:gid("colabAdmissao").value||null, nfc_tag:gid("colabNFC").value||null };
  const id = gid("formColab").dataset.id;
  if(id){ await sb.from("colaboradores").update(row).eq("id",id) } else { await sb.from("colaboradores").insert(row) }
  gid("formColab").dataset.id=""; gid("btnAddColab").textContent="Salvar"; toast("Colaborador salvo"); refreshColab(); loadCombos();
}

/* Atividades CRUD */
async function refreshAtiv(){
  const f = (gid("qAtiv").value||"").trim();
  let q = sb.from("atividades").select("id,nome,cronograma_id,prazo,obras(nome, id)").order("created_at",{ascending:false});
  if(f){ q = q.ilike("nome","%"+f+"%"); }
  const atv = (await q).data||[];
  gid("listaAtivs").innerHTML = atv.map(a=>`<tr data-id="${a.id}"><td>${a.nome}</td><td>${a.obras?.nome||"—"}</td><td>${a.cronograma_id||""}</td><td>${a.prazo||""}</td></tr>`).join("");
}
async function startEditAtiv(id){
  const r = (await sb.from("atividades").select("*").eq("id",id).single()).data;
  gid("formAtiv").style.display="block"; gid("formAtiv").dataset.id=id; gid("btnAddAtiv").textContent="Atualizar";
  gid("ativObra").value=r.obra_id||""; gid("ativNome").value=r.nome||""; gid("ativCrono").value=r.cronograma_id||""; gid("ativPrazo").value=r.prazo||"";
  makeSearchableSelect(gid("ativObra"));
}
async function saveAtiv(){
  const obra_id = gid("ativObra").value||null;
  const nome = gid("ativNome").value;
  if(!nome){ alert("Informe o nome da atividade"); return }
  if(!gid("formAtiv").dataset.id){
    const dup = await sb.from("atividades").select("id",{count:"exact",head:true}).eq("obra_id",obra_id).ilike("nome",nome);
    if(dup.count>0){ alert("Atividade já cadastrada nesta obra."); return }
  }
  const row={ obra_id, nome, cronograma_id:gid("ativCrono").value, prazo:Number(gid("ativPrazo").value||0) };
  const id = gid("formAtiv").dataset.id;
  if(id){ await sb.from("atividades").update(row).eq("id",id) } else { await sb.from("atividades").insert(row) }
  gid("formAtiv").dataset.id=""; gid("btnAddAtiv").textContent="Salvar"; toast("Atividade salva"); refreshAtiv(); loadCombos();
}

/* Equipamentos CRUD */
async function refreshEquip(){
  const f = (gid("qEquip").value||"").trim();
  let q = sb.from("equipamentos").select("id,nome,marca,modelo,motorista_id").order("created_at",{ascending:false});
  if(f){ q = q.or(`nome.ilike.%${f}%,modelo.ilike.%${f}%`); }
  const encMap = {}; (await sb.from("colaboradores").select("id,nome")).data?.forEach(e=> encMap[e.id]=e.nome);
  const eq = (await q).data||[];
  gid("listaEquip").innerHTML = eq.map(e=>`<tr data-id="${e.id}"><td>${e.nome}</td><td>${e.marca||""}</td><td>${e.modelo||""}</td><td>${encMap[e.motorista_id]||"—"}</td></tr>`).join("");
}
async function startEditEquip(id){
  const r = (await sb.from("equipamentos").select("*").eq("id",id).single()).data;
  gid("formEquip").style.display="block"; gid("formEquip").dataset.id=id; gid("btnAddEquip").textContent="Atualizar";
  gid("eqcNome").value=r.nome||""; gid("eqcMarca").value=r.marca||""; gid("eqcModelo").value=r.modelo||"";
  gid("eqcData").value=r.data||""; gid("eqcHKm").value=r.horimetro_km||""; gid("eqcMotorista").value=r.motorista_id||"";
  makeSearchableSelect(gid("eqcMotorista"));
}
async function saveEquip(){
  const nome = gid("eqcNome").value||"";
  const modelo = gid("eqcModelo").value||"";
  if(!gid("formEquip").dataset.id){
    const dup = await sb.from("equipamentos").select("id",{count:"exact",head:true}).ilike("nome",nome).ilike("modelo",modelo);
    if(dup.count>0){ alert("Equipamento já cadastrado."); return }
  }
  const row={ nome, marca:gid("eqcMarca").value, modelo, data:gid("eqcData").value||null, horimetro_km:Number(gid("eqcHKm").value||0), motorista_id:gid("eqcMotorista").value||null };
  const id = gid("formEquip").dataset.id;
  if(id){ await sb.from("equipamentos").update(row).eq("id",id) } else { await sb.from("equipamentos").insert(row) }
  gid("formEquip").dataset.id=""; gid("btnAddEquip").textContent="Salvar"; toast("Equipamento salvo"); refreshEquip(); loadCombos();
}

/* Materiais CRUD */
async function refreshMat(){
  const f = (gid("qMat").value||"").trim();
  let q = sb.from("materiais").select("id,nome,unidade").order("nome");
  if(f){ q = q.or(`nome.ilike.%${f}%,unidade.ilike.%${f}%`); }
  const m = (await q).data||[];
  gid("listaMat").innerHTML = m.map(x=>`<tr data-id="${x.id}"><td>${x.nome}</td><td>${x.unidade||""}</td></tr>`).join("");
}
async function startEditMat(id){
  const r = (await sb.from("materiais").select("*").eq("id",id).single()).data;
  gid("formMat").style.display="block"; gid("formMat").dataset.id=id; gid("btnAddMatSave").textContent="Atualizar";
  gid("matcNome").value=r.nome||""; gid("matcUnid").value=r.unidade||"";
}
async function saveMat(){
  const nome = gid("matcNome").value||""; const unid = gid("matcUnid").value||"";
  if(!nome || !unid){ alert("Preencha nome e unidade"); return }
  if(!gid("formMat").dataset.id){
    const dup = await sb.from("materiais").select("id",{count:"exact",head:true}).ilike("nome",nome).ilike("unidade",unid);
    if(dup.count>0){ alert("Material já cadastrado."); return }
  }
  const row = { nome, unidade: unid };
  const id = gid("formMat").dataset.id;
  if(id){ await sb.from("materiais").update(row).eq("id",id) } else { await sb.from("materiais").insert(row) }
  gid("formMat").dataset.id=""; gid("btnAddMatSave").textContent="Salvar"; toast("Material salvo"); refreshMat(); loadCombos();
}

/* Inicial */
window.addEventListener("load", ()=>{
  gid("rdoListIni").value = today();
  gid("rdoListFim").value = today();
});

/* Util */
function makeOptions(selectId, arr){ const s=gid(selectId); if(!s) return; s.innerHTML=""; arr.forEach(o=> s.append(new Option(o.text,o.id))); }
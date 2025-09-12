// ====== CONFIG SUPABASE ======
const SUPABASE_URL = "https://iyizkskjjizqlcoakgrb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5aXprc2tqaml6cWxjb2FrZ3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NjI2NzYsImV4cCI6MjA3MjQzODY3Nn0.DJ-lFWRRtqWDNYu2NYbT-NOWaMy9jFJICBS4TsJveDA";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== NAV ======
const nav = document.getElementById('nav');
nav.addEventListener('click', (e)=>{
  if(e.target.matches('a[data-tab]')){
    document.querySelectorAll('header nav a').forEach(a=>a.classList.remove('active'));
    e.target.classList.add('active');
    document.querySelectorAll('main > section').forEach(s=>s.style.display='none');
    document.querySelector(e.target.dataset.tab).style.display='block';
  }
});

document.getElementById('btnPrint')?.addEventListener('click', ()=> window.print());
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.style.display='block'; setTimeout(()=>t.style.display='none', 3000); }

// ====== AUTH ======
const formSignIn = document.getElementById('formSignIn');
const formSignUp = document.getElementById('formSignUp');
const btnSignOut  = document.getElementById('btnSignOut');

formSignIn.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('inEmail').value;
  const password = document.getElementById('inPass').value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if(error){ alert('Erro ao entrar: '+error.message); return; }
  onAuthChanged();
});

formSignUp.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('upEmail').value;
  const password = document.getElementById('upPass').value;
  const nome = document.getElementById('upNome').value;
  const telefone = document.getElementById('upTel').value;
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if(error){ alert('Erro ao cadastrar: '+error.message); return; }
  const user = data.user; if(user){ await supabaseClient.from('profiles').insert({ id:user.id, nome, telefone }); }
  alert('Conta criada! Confira seu e-mail e faça login.');
});

btnSignOut.addEventListener('click', async ()=>{
  await supabaseClient.auth.signOut();
  onAuthChanged();
});

async function onAuthChanged(){
  const { data:{ user } } = await supabaseClient.auth.getUser();
  const isLogged = !!user;
  document.getElementById('btnSignOut').style.display = isLogged ? 'inline-flex' : 'none';
  document.querySelectorAll('main > section').forEach(s=>s.style.display='none');
  document.querySelector(isLogged ? '#tab-dashboard' : '#tab-auth').style.display='block';
  document.querySelectorAll('header nav a').forEach(a=>a.classList.remove('active'));
  document.querySelector(`header nav a[data-tab='${isLogged?'#tab-dashboard':'#tab-auth'}']`).classList.add('active');
  if(isLogged){ await loadCombos(); await loadDashboard(); }
}
onAuthChanged();

// ====== UTIL ======
const gid = (id)=> document.getElementById(id);
const val = (id)=>{ const el=gid(id); return el && 'value' in el ? (el.value??'').toString().trim(): ''; };
const num = (id)=>{ const el=gid(id); if(!el) return null; const v = el.value; return v? Number(v): null; };
const timeToHours = (t)=>{ if(!t) return 0; const [h,m] = t.split(':').map(Number); return (h||0)+((m||0)/60); };

// ====== CADASTROS ======
async function listObras(){ const { data, error } = await supabaseClient.from('obras').select('*').order('created_at',{ascending:false});
  gid('listaObras').innerHTML = error? ('<div class="hint">Crie a tabela obras</div>') : ((data&&data.length)? data.map(o=>`<div class="pill">${o.nome} - ${o.gestor||'—'}</div>`).join('') : 'Sem obras'); }
async function listColabs(){ const { data, error } = await supabaseClient.from('colaboradores').select('*').order('created_at',{ascending:false});
  gid('listaColabs').innerHTML = error? ('<div class="hint">Crie a tabela colaboradores</div>') : ((data&&data.length)? data.map(o=>`<div class="pill">${o.nome} - ${o.funcao||'—'}</div>`).join('') : 'Sem colaboradores'); }
async function listAtivs(){ const { data, error } = await supabaseClient.from('atividades').select('*, obras(nome)').order('created_at',{ascending:false});
  gid('listaAtivs').innerHTML = error? ('<div class="hint">Crie a tabela atividades</div>') : ((data&&data.length)? data.map(a=>`<div class="pill">${a.nome} - ${a.obras?.nome||'—'}</div>`).join('') : 'Sem atividades'); }
async function listEquip(){ const { data, error } = await supabaseClient.from('equipamentos').select('*, colaboradores(nome)').order('created_at',{ascending:false});
  gid('listaEquip').innerHTML = error? ('<div class="hint">Crie a tabela equipamentos</div>') : ((data&&data.length)? data.map(e=>`<div class="pill">${e.nome} - ${e.marca||''} ${e.modelo||''}</div>`).join('') : 'Sem equipamentos'); }
async function listMatCad(){ const { data, error } = await supabaseClient.from('materiais').select('*').order('created_at',{ascending:false});
  gid('listaMatCad').innerHTML = error? ('<div class="hint">Crie a tabela materiais</div>') : ((data&&data.length)? data.map(m=>`<div class="pill">${m.nome} (${m.unidade||''})</div>`).join('') : 'Sem materiais'); }

async function loadCombos(){
  let { data: obras } = await supabaseClient.from('obras').select('id, nome').order('nome');
  fillSelect('filtroObra', obras, 'id','nome', true);
  fillSelect('rdoObra', obras, 'id','nome', false);
  fillSelect('ativObra', obras, 'id','nome', false);
  let { data: cols } = await supabaseClient.from('colaboradores').select('id, nome').order('nome');
  fillSelect('hhColab', cols, 'id','nome', false);
  fillSelect('occColabs', cols, 'id','nome', false, true);
  fillSelect('eqMotorista', cols, 'id','nome', false);
  fillSelect('eqcMotorista', cols, 'id','nome', true);
  let { data: atvs } = await supabaseClient.from('atividades').select('id, nome').order('nome');
  fillSelect('hhAtividade', atvs, 'id','nome', false);
  let { data: eqs } = await supabaseClient.from('equipamentos').select('id, nome').order('nome');
  fillSelect('eqEquip', eqs, 'id','nome', false);
  let { data: mats } = await supabaseClient.from('materiais').select('id, nome, unidade').order('nome');
  fillSelect('matItem', mats, 'id','nome', false);
  listObras(); listColabs(); listAtivs(); listEquip(); listMatCad();
}
function fillSelect(id, data, valueField, textField, addAll, isMultiple){
  const sel = gid(id); if(!sel) return; sel.innerHTML='';
  if(addAll && !isMultiple) sel.append(new Option('Todas',''));
  (data||[]).forEach(r=> sel.append(new Option(r[textField], r[valueField])) );
}

// ====== HH / Ocorrencias / Equip / Materiais ======
const hhRows = []; const occRows = []; const eqRows = []; const matRows = [];
gid('btnAddHH')?.addEventListener('click', ()=>{
  const colabSel = gid('hhColab'); const ativSel = gid('hhAtividade'); const horasTime = gid('hhHoras')? gid('hhHoras').value||'00:00' : '00:00';
  if(!colabSel?.value || !ativSel?.value){ alert('Selecione colaborador e atividade.'); return; }
  const horas = timeToHours(horasTime);
  const row = { colaborador_id: colabSel.value, colaborador_nome: colabSel.options[colabSel.selectedIndex].text,
                atividade_id: ativSel.value, atividade_nome: ativSel.options[ativSel.selectedIndex].text, horas, horas_str: horasTime };
  hhRows.push(row); renderHH();
});
function renderHH(){ const tb = document.querySelector('#tblHH tbody'); if(!tb) return; tb.innerHTML = hhRows.map((r,i)=>`<tr><td>${r.colaborador_nome}</td><td>${r.atividade_nome}</td><td>${r.horas_str}</td><td><button data-i="${i}" class="btn ghost">X</button></td></tr>`).join(''); }
document.querySelector('#tblHH tbody')?.addEventListener('click',(e)=>{ if(e.target.tagName==='BUTTON'){ hhRows.splice(Number(e.target.dataset.i),1); renderHH(); } });

gid('btnAddOcc')?.addEventListener('click', ()=>{
  const tipo = gid('occTipo')? gid('occTipo').value : '';
  const descEl = gid('occDesc'); const desc = descEl? descEl.value.trim(): '';
  const prazoStr = gid('occPrazo')? (gid('occPrazo').value||'00:00') : '00:00';
  const colSel = gid('occColabs'); const colIds = colSel? Array.from(colSel.selectedOptions).map(o=>o.value):[];
  if(!desc){ alert('Descreva a ocorrencia'); return; }
  const prazo_h = timeToHours(prazoStr);
  occRows.push({ tipo, descricao:desc, prazo_h, prazo_str:prazoStr, colabs: colIds });
  renderOcc();
  if(descEl) descEl.value=''; if(gid('occPrazo')) gid('occPrazo').value='00:00'; if(colSel) colSel.selectedIndex=-1;
});
function renderOcc(){ const el = gid('occLista'); if(!el) return; el.innerHTML = occRows.length? occRows.map((o,i)=>`<li>#${i+1} ${o.tipo} - ${o.descricao} (${o.prazo_str})</li>`).join('') : 'Sem ocorrencias'; }

gid('btnAddEq')?.addEventListener('click', ()=>{
  const eqSel = gid('eqEquip'); const motSel = gid('eqMotorista');
  if(!eqSel?.value){ alert('Selecione o equipamento'); return; }
  eqRows.push({ equipamento_id:eqSel.value, equipamento_nome:eqSel.options[eqSel.selectedIndex].text, motorista_id: motSel?.value||null, motorista_nome: motSel?.value? motSel.options[motSel.selectedIndex].text: '', h_ini: Number(gid('eqHini')?.value||0), h_fim: Number(gid('eqHfim')?.value||0) });
  renderEq(); if(gid('eqHini')) gid('eqHini').value=''; if(gid('eqHfim')) gid('eqHfim').value='';
});
function renderEq(){ const tb = gid('tblEq')?.querySelector('tbody'); if(!tb) return; tb.innerHTML = eqRows.map((r,i)=>`<tr><td>${r.equipamento_nome}</td><td>${r.motorista_nome||'—'}</td><td>${r.h_ini||''}</td><td>${r.h_fim||''}</td><td><button data-i="${i}" class="btn ghost">X</button></td></tr>`).join(''); }
gid('tblEq')?.addEventListener('click',(e)=>{ if(e.target.tagName==='BUTTON'){ eqRows.splice(Number(e.target.dataset.i),1); renderEq(); } });

gid('btnAddMat')?.addEventListener('click', ()=>{
  const mSel = gid('matItem'); if(!mSel?.value){ alert('Selecione material'); return; }
  const acao = gid('matAcao')? gid('matAcao').value: 'recebido'; const qt = Number(gid('matQtde')?.value||0); const un = gid('matUnid')?.value||'';
  matRows.push({ material_id:mSel.value, material_nome:mSel.options[mSel.selectedIndex].text, acao, qtde:qt, unid:un });
  renderMat(); if(gid('matQtde')) gid('matQtde').value=''; if(gid('matUnid')) gid('matUnid').value='';
});
function renderMat(){ const tb = gid('tblMat')?.querySelector('tbody'); if(!tb) return; tb.innerHTML = matRows.map((r,i)=>`<tr><td>${r.material_nome}</td><td>${r.acao}</td><td>${r.qtde}</td><td>${r.unid}</td><td><button data-i="${i}" class="btn ghost">X</button></td></tr>`).join(''); }
gid('tblMat')?.addEventListener('click',(e)=>{ if(e.target.tagName==='BUTTON'){ matRows.splice(Number(e.target.dataset.i),1); renderMat(); } });

// Dia da semana
const rdoData = gid('rdoData');
rdoData?.addEventListener('change', ()=>{ const d = new Date(rdoData.value); const lab = gid('rdoDow'); if(lab) lab.textContent = d.toLocaleDateString('pt-BR',{weekday:'long'}); });

// PTS enable/disable
document.querySelectorAll('input[name="pts"]').forEach(r=>{
  r.addEventListener('change',()=>{
    const on = (document.querySelector('input[name="pts"]:checked')?.value==='sim');
    const ptsN = gid('ptsNumero'), ptsA = gid('ptsAbertura'); if(ptsN) ptsN.disabled = !on; if(ptsA) ptsA.disabled = !on;
  });
});

// Salvar RDO
gid('btnSalvarRDO')?.addEventListener('click', async()=>{
  const obra_id = gid('rdoObra')? gid('rdoObra').value: null; if(!obra_id){ alert('Selecione a obra'); return; }
  const numero = val('rdoNumero'); const data = val('rdoData'); if(!data){ alert('Informe a data'); return; }
  if(!val('horaChegada')){ alert('Informe hora de chegada'); return; }
  if(!val('horaInicioTrab')){ alert('Informe hora de inicio do trabalho'); return; }
  if(!val('atividadesDia')){ alert('Descreva as atividades do dia'); return; }
  if(hhRows.length && !(gid('fotosAtv')?.files && gid('fotosAtv').files.length)){ alert('Adicione pelo menos 1 foto de atividade.'); return; }
  if(occRows.length && !(gid('fotosOcc')?.files && gid('fotosOcc').files.length)){ alert('Adicione pelo menos 1 foto de ocorrencia.'); return; }

  const pts = (document.querySelector('input[name="pts"]:checked')?.value==='sim');

  const row = {
    obra_id, numero, data,
    clima_manha: val('climaManha'), clima_tarde: val('climaTarde'), clima_noite: val('climaNoite'), resumo: val('rdoResumo'),
    hora_chegada: val('horaChegada'), teve_pts: pts, pts_numero: pts? val('ptsNumero'): null, pts_abertura: pts? val('ptsAbertura'): null,
    inicio_trabalho: val('horaInicioTrab'), atividades_dia: val('atividadesDia')
  };
  const { data:auth } = await supabaseClient.auth.getUser(); const userId = auth?.user?.id || null; row.created_by = userId;

  const { data: rdoIns, error } = await supabaseClient.from('rdo').insert(row).select('id');
  if(error){ alert('Erro ao salvar RDO: '+error.message); return; }
  const rdo_id = rdoIns?.[0]?.id;

  if(hhRows.length){ const hh = hhRows.map(h=> ({ rdo_id, colaborador_id:h.colaborador_id, atividade_id:h.atividade_id, horas:h.horas }));
    const { error: e2 } = await supabaseClient.from('rdo_hh').insert(hh); if(e2){ alert('HH: '+e2.message); }
  }
  for(const o of occRows){
    const { data: occIns, error: eO } = await supabaseClient.from('ocorrencias').insert({ obra_id, rdo_id, tipo:o.tipo, descricao:o.descricao, impacto_prazo_h:o.prazo_h, data });
    if(!eO){ const ocorr_id = occIns?.[0]?.id; if(ocorr_id && o.colabs && o.colabs.length){
      const rows = o.colabs.map(cid=> ({ ocorrencia_id: ocorr_id, colaborador_id: cid, prazo_impactado_h:o.prazo_h }));
      await supabaseClient.from('ocorrencias_env').insert(rows);
    }}
  }
  if(eqRows.length){ const eq = eqRows.map(e=> ({ rdo_id, equipamento_id:e.equipamento_id, motorista_id:e.motorista_id, h_inicial:e.h_ini, h_final:e.h_fim }));
    const { error: eE } = await supabaseClient.from('rdo_equip').insert(eq); if(eE){ alert('Equip no RDO: '+eE.message); }
  }
  if(matRows.length){ const mm = matRows.map(m=> ({ rdo_id, material_id:m.material_id, acao:m.acao, quantidade:m.qtde, unidade:m.unid }));
    const { error: eM } = await supabaseClient.from('rdo_materiais').insert(mm); if(eM){ alert('Materiais no RDO: '+eM.message); }
  }
  await uploadFotos('fotosAtv', rdo_id, 'atividades');
  await uploadFotos('fotosOcc', rdo_id, 'ocorrencias');

  // limpar e voltar
  hhRows.splice(0); occRows.splice(0); eqRows.splice(0); matRows.splice(0); renderHH(); renderOcc(); renderEq(); renderMat();
  const dashTab = document.querySelector("header nav a[data-tab='#tab-dashboard']"); if(dashTab) dashTab.click();
  await loadDashboard();
  toast('RDO salvo com sucesso');
});

async function uploadFotos(inputId, rdo_id, pasta){
  const inp = gid(inputId); if(!inp || !inp.files || !inp.files.length) return;
  for(const f of inp.files){
    const path = `rdo/${rdo_id}/${pasta}/${Date.now()}_${f.name}`;
    try{ const { error } = await supabaseClient.storage.from('rdo_fotos').upload(path, f, { upsert:false }); if(error) console.warn(error); }
    catch(err){ console.warn('upload', err); }
  }
}

// ====== CLIMA (Open-Meteo) ======
document.body.addEventListener('click', async(e)=>{
  if(e.target && e.target.id==='btnClima'){
    try{
      const pos = await new Promise((res,rej)=> navigator.geolocation.getCurrentPosition(res,rej));
      const lat = pos.coords.latitude.toFixed(4), lon = pos.coords.longitude.toFixed(4);
      const date = gid('rdoData')?.value || new Date().toISOString().slice(0,10);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation,wind_speed_10m&start_date=${date}&end_date=${date}&timezone=auto`;
      const resp = await fetch(url); const js = await resp.json();
      const precip = js.hourly?.precipitation || []; const wind = js.hourly?.wind_speed_10m || [];
      const mm = avg(precip,7,11), mt = avg(precip,12,17), mn = avg(precip,18,22);
      const wm = avg(wind,7,11), wt = avg(wind,12,17), wn = avg(wind,18,22);
      const cM = gid('climaManha'), cT = gid('climaTarde'), cN = gid('climaNoite');
      if(cM) cM.value = chooseWeather(mm, wm);
      if(cT) cT.value = chooseWeather(mt, wt);
      if(cN) cN.value = chooseWeather(mn, wn);
    }catch(err){ alert('Clima: habilite geolocalizacao. '+err.message); }
  }
});
function avg(arr, h1, h2){ let s=0,c=0; for(let h=h1; h<=h2; h++){ const i=h; if(arr[i]!=null){ s+=arr[i]; c++; } } return c? s/c: 0; }
function chooseWeather(p, w){ if(w>=40) return 'Ventos fortes'; if(p>=10) return 'Chuvas fortes'; if(p>=1) return 'Chuvas leves'; return 'Seco'; }

// ====== NFC ======
const btnNFC = gid('btnNFC'); const nfcStatus = gid('nfcStatus');
btnNFC?.addEventListener('click', async()=>{
  if(!('NDEFReader' in window)){ if(nfcStatus){ nfcStatus.textContent='NFC nao suportado'; nfcStatus.className='badge status-bad'; } return; }
  try{
    const reader = new NDEFReader(); await reader.scan(); if(nfcStatus){ nfcStatus.textContent='Aproxime o cracha...'; nfcStatus.className='badge'; }
    reader.onreading = async (event)=>{
      const idHex = [...new Uint8Array(event.serialNumber? hexToBytes(event.serialNumber): event.message.records?.[0]?.data||[])].map(b=>b.toString(16).padStart(2,'0')).join('');
      if(nfcStatus){ nfcStatus.textContent='TAG: '+idHex.slice(0,16)+'...'; nfcStatus.className='badge status-ok'; }
      const colSel = gid('hhColab'); if(colSel?.value){ await supabaseClient.from('colaboradores').update({ nfc_tag:idHex }).eq('id', colSel.value); }
    };
  }catch(err){ if(nfcStatus){ nfcStatus.textContent='NFC erro: '+err.message; nfcStatus.className='badge status-bad'; } }
});
function hexToBytes(hex){ const bytes=[]; for(let c=0;c<hex.length;c+=2) bytes.push(parseInt(hex.substr(c,2),16)); return new Uint8Array(bytes); }

// ====== DASHBOARD ======
const btnAplicarFiltros = gid('btnAplicarFiltros');
let chartHH, chartOc;
btnAplicarFiltros?.addEventListener('click', loadDashboard);

async function loadDashboard(){
  const obra = gid('filtroObra')? gid('filtroObra').value : null; 
  const ini = gid('filtroIni')? gid('filtroIni').value : ''; 
  const fim = gid('filtroFim')? gid('filtroFim').value : '';
  const hoje = new Date(); 
  const from = ini || new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()-30).toISOString().slice(0,10);
  const to = fim || hoje.toISOString().slice(0,10);
  let q = supabaseClient.from('rdo_hh').select('horas, colaborador_id, rdo:data!inner(data, obra_id)').gte('data',from).lte('data',to);
  if(obra) q = q.eq('rdo.obra_id', obra);
  const { data: hh, error } = await q;
  if(error){ console.warn(error); }
  const series = aggregateHH(hh||[]);
  drawChart('chartHH','HH por dia', series.labels, series.values);
  const kpiHH = gid('kpiHH'); if(kpiHH) kpiHH.textContent = (series.values.reduce((a,b)=>a+b,0)).toFixed(1)+' h';
  const kpiEf = gid('kpiEfetivo'); if(kpiEf) kpiEf.textContent = new Set((hh||[]).map(r=>r.colaborador_id).filter(Boolean)).size || '—';

  let q2 = supabaseClient.from('ocorrencias').select('tipo, data').gte('data',from).lte('data',to);
  if(obra) q2 = q2.eq('obra_id', obra);
  const { data: occ } = await q2;
  const ocAgg = Object.entries((occ||[]).reduce((a,r)=>{ a[r.tipo]=(a[r.tipo]||0)+1; return a; },{}));
  drawChart('chartOcorr','Ocorrencias por tipo', ocAgg.map(o=>o[0]), ocAgg.map(o=>o[1]));
  const kpiOc = gid('kpiOcorr'); if(kpiOc) kpiOc.textContent = (occ||[]).length;
}
function aggregateHH(rows){ const map = new Map(); for(const r of rows){ const d = r.rdo?.data; if(!d) continue; map.set(d,(map.get(d)||0)+ (r.horas||0)); } const labels = [...map.keys()].sort(); const values = labels.map(k=> map.get(k)); return { labels, values }; }
function drawChart(id, title, labels, values){ const el = document.getElementById(id); if(!el) return; const ctx = el.getContext('2d'); const existing = (id==='chartHH')? chartHH: chartOc; if(existing) existing.destroy(); const cfg = { type:'line', data:{ labels, datasets:[{ label:title, data:values }] }, options:{ responsive:true, maintainAspectRatio:false } }; const c = new Chart(ctx, cfg); if(id==='chartHH') chartHH=c; else chartOc=c; }

// PWA register
if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch(console.warn); }

// Init
window.addEventListener('load', ()=>{
  listObras(); listColabs(); listAtivs(); listEquip(); listMatCad();
  ['rdoData','climaManha','climaTarde','climaNoite','rdoObra','hhColab','hhAtividade','matItem','eqEquip'].forEach(id=>{ if(!document.getElementById(id)) console.warn('Elemento ausente:', id); });
});

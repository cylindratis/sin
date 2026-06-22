(function(){
  const data = window.FINOR_SITE_DATA;
  const ORANGE = '#ff5a19';

  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function fmtPct(v, digits=1){ const n=Number(v||0)*100; return n.toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits})+'%'; }
  function fmtNum(v, digits=2){ return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits}); }
  function fmtMoney(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}); }
  function dark(){ return document.documentElement.classList.contains('dark'); }
  function colors(){ const p = window.FinorCharts ? FinorCharts.palette() : {primary:ORANGE, secondary:'#212121', muted:'rgba(33,33,33,.55)'}; return { primary:p.primary, secondary:p.secondary, muted:p.muted, grid:p.grid, line3: dark()?'rgba(241,238,238,.55)':'rgba(33,33,33,.50)', line4: dark()?'rgba(241,238,238,.34)':'rgba(33,33,33,.34)', line5: 'rgba(255,90,25,.45)' }; }
  function assetLabel(s){ return String(s || '').replace(/\.SA$/i, ''); }
  function industryLabel(row){ return row?.industriaYahoo || row?.industryYahoo || row?.industria_yahoo || row?.setor || '--'; }

  function initCommon(){
    if (window.lucide) lucide.createIcons();
    const themeToggleBtn = qs('#theme-toggle');
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      setTimeout(redrawAll, 60);
    });
    const blob = qs('#mouse-blob');
    if (blob) document.body.onpointermove = event => { blob.animate({ left:`${event.clientX}px`, top:`${event.clientY}px` }, { duration:3000, fill:'forwards' }); };
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting){ entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }}), { threshold:.18, rootMargin:'0px 0px -8% 0px'});
    qsa('[data-reveal-group], .brand-reveal, .fade-reveal').forEach(el => revealObserver.observe(el));
  }

  function initHero(){
    const qMark = qs('#question-mark'), dotMark = qs('#dot-mark'), typed = qs('#typed-text'), cursor = qs('#cursor'), cta = qs('#cta-container');
    if (!qMark || !dotMark || !typed || !cursor || !cta) return;
    const fullText = 'e esse é o nosso projeto.'; let started = false;
    function start(){ if(started) return; started=true;
      setTimeout(()=>{ qMark.classList.remove('opacity-100','scale-100'); qMark.classList.add('opacity-0','scale-50','w-0'); dotMark.classList.remove('hidden-force'); setTimeout(()=>{ dotMark.classList.remove('opacity-0','scale-50'); dotMark.classList.add('opacity-100','scale-100'); },50); },2500);
      setTimeout(()=>{ cursor.classList.remove('hidden-force'); let i=0; const timer=setInterval(()=>{ typed.textContent=fullText.substring(0,i+1); i++; if(i===fullText.length){ clearInterval(timer); setTimeout(()=>{ cta.classList.remove('opacity-0','translate-y-8','pointer-events-none'); cta.classList.add('opacity-100','translate-y-0'); cta.style.pointerEvents='auto'; },500); } },70); },3100);
    }
    start();
  }

  let homeState = { period:'all' };
  function periodRows(rows, period){
    const count = period === '1m' ? 21 : period === '6m' ? 126 : period === '12m' ? 252 : rows.length;
    return rows.slice(Math.max(0, rows.length - count));
  }
  function cumulativeMoney(rows, amount){
    let acc = { ibov:amount, ico2_otima:amount, ise_otima:amount, isus11:amount, ecoo11:amount };
    return rows.map(r => {
      Object.keys(acc).forEach(k => { acc[k] *= 1 + Number(r[k] || 0); });
      return { date:r.date, ibov:acc.ibov, ico2_otima:acc.ico2_otima, ise_otima:acc.ise_otima, isus11:acc.isus11, ecoo11:acc.ecoo11 };
    });
  }
  function drawHome(){
    const canvas = qs('#home-profit-chart'); if(!canvas || !window.FinorCharts || !data) return;
    const amount = Math.max(1, Number(qs('#home-amount')?.value || data.amountDefault || 10000));
    const rows = periodRows(data.performanceDaily || [], homeState.period);
    const chartRows = cumulativeMoney(rows, amount);
    const c = colors();
    FinorCharts.lineChart(canvas, chartRows, { limit:520, series:[
      {key:'ico2_otima', label:'ICO2 ótima', color:c.primary, width:2.8},
      {key:'ise_otima', label:'ISE ótima', color:c.secondary, width:2.4},
      {key:'ibov', label:'IBOV', color:c.line3, width:1.9, dash:[6,5]},
      {key:'isus11', label:'ISUS11', color:c.line4, width:1.7, dash:[3,5]},
      {key:'ecoo11', label:'ECOO11', color:c.line5, width:1.7, dash:[8,4]}
    ]});
    const cards = qs('#home-result-cards');
    if(cards){
      const last = chartRows[chartRows.length-1] || {};
      const items = [
        ['ico2_otima','Carteira ICO2 ótima'], ['ise_otima','Carteira ISE ótima'], ['ibov','IBOVESPA'], ['isus11','ISUS11'], ['ecoo11','ECOO11']
      ].map(([key,label]) => ({ key,label,value:last[key]||amount, ret: ((last[key]||amount)/amount)-1 })).sort((a,b)=>b.value-a.value);
      cards.innerHTML = items.map((it,i)=>`<div class="thesis-line pt-5"><div class="text-4xl ${i===0?'md:text-5xl':'md:text-4xl'} font-bold ${i===0?'text-laranja':''} leading-none tracking-tight">${fmtMoney(it.value)}</div><p class="mt-2 font-geist-mono text-xs uppercase tracking-[0.22em] opacity-60">${it.label}</p><p class="mt-3 text-sm md:text-base font-semibold ${i===0?'text-laranja':''}">Retorno acumulado: ${fmtPct(it.ret)}</p></div>`).join('');
    }
    const label = qs('#home-period-label');
    if(label){ label.textContent = homeState.period==='all' ? 'desde 2021' : homeState.period.replace('m',' mês').replace('6 mês','6 meses').replace('12 mês','12 meses'); }
  }
  function initHome(){
    if(!qs('#home-profit-chart')) return;
    qsa('#home-periods .period-btn').forEach(btn => btn.addEventListener('click', () => { homeState.period = btn.dataset.period; qsa('#home-periods .period-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); drawHome(); }));
    qs('#home-amount')?.addEventListener('input', drawHome);
    drawHome();
  }

  function returnsToCumulative(rows, keys){
    const acc = {}; keys.forEach(k => acc[k] = 1);
    return rows.map(r => {
      const out = {date:r.date};
      keys.forEach(k => { acc[k] *= 1 + Number(r[k] || 0); out[k] = acc[k] - 1; });
      return out;
    });
  }

  function portfolioChoices(p){
    const metrics = p.metricsByK || {};
    const ks = (p.ks || Object.keys(metrics)).map(String).filter(k => metrics[k]);
    if(!ks.length) return [];
    const bestReturn = ks.reduce((best,k)=> Number(metrics[k].retorno_total) > Number(metrics[best].retorno_total) ? k : best, ks[0]);
    const bestTE = ks.reduce((best,k)=> Number(metrics[k].tracking_error_anualizado) < Number(metrics[best].tracking_error_anualizado) ? k : best, ks[0]);
    const bestCorr = ks.reduce((best,k)=> Number(metrics[k].correlacao_ibov) > Number(metrics[best].correlacao_ibov) ? k : best, ks[0]);
    return [
      { id:'maior-retorno', label:'Maior retorno total', k:bestReturn, metric:'retorno_total' },
      { id:'menor-tracking-error', label:'Menor tracking-error', k:bestTE, metric:'tracking_error_anualizado' },
      { id:'maior-correlacao', label:'Maior correlação com IBOV', k:bestCorr, metric:'correlacao_ibov' }
    ];
  }
  function activeChoice(p){ return (portfolioChoices(p).find(c => c.id === portfolioState.choice) || portfolioChoices(p)[0] || {id:'', label:'Carteira selecionada', k:portfolioState.k}); }

  let portfolioState = { index:null, choice:null, k:null, toggles:{selected:true, ibov:true, etfs:true, otimas:true} };
  function initPortfolio(){
    const indexName = document.body.dataset.index; if(!indexName || !data || !data.portfolios[indexName]) return;
    portfolioState.index = indexName;
    const p = data.portfolios[indexName];
    const choices = portfolioChoices(p);
    portfolioState.choice = choices[0]?.id || 'maior-retorno';
    portfolioState.k = String(choices[0]?.k || p.bestK);
    const select = qs('#k-select');
    if(select){
      select.innerHTML = choices.map(ch => `<option value="${ch.id}">${ch.label} • k=${ch.k}</option>`).join('');
      select.value = portfolioState.choice;
      select.addEventListener('change', () => { const ch = choices.find(c => c.id === select.value) || choices[0]; portfolioState.choice = ch.id; portfolioState.k = String(ch.k); updatePortfolio(); });
    }
    const toggles = [
      ['selected','Carteira selecionada'], ['ibov','IBOVESPA'], ['etfs','ETFs'], ['otimas','Carteiras ótimas']
    ];
    const seriesToggles = qs('#series-toggles');
    if(seriesToggles){
      seriesToggles.innerHTML = toggles.map(([key,label]) => `<label class="chip-toggle cursor-pointer"><input type="checkbox" class="hidden" data-toggle="${key}" ${portfolioState.toggles[key]?'checked':''}><span class="inline-flex px-3 py-2 rounded-full border border-chumbo/10 dark:border-white/10 text-xs font-semibold bg-gelo dark:bg-white/5">${label}</span></label>`).join('');
      qsa('#series-toggles input').forEach(input => input.addEventListener('change', () => { portfolioState.toggles[input.dataset.toggle] = input.checked; drawPortfolioChart(); }));
    }
    updatePortfolio();
  }
  function metricCard(title,value,sub='',orange=false){ return `<div class="rounded-2xl bg-gelo dark:bg-white/5 p-5"><p class="text-xs uppercase tracking-widest opacity-50">${title}</p><strong class="block mt-3 text-3xl font-geist-mono ${orange?'text-laranja':''}">${value}</strong>${sub?`<p class="mt-2 text-xs opacity-50">${sub}</p>`:''}</div>`; }
  function updatePortfolio(){
    const p = data.portfolios[portfolioState.index]; const choice = activeChoice(p); const k = String(choice.k);
    portfolioState.k = k;
    const m = p.metricsByK[k] || {}; const s = p.statsByK[k] || {};
    const pill = qs('#hero-k-pill'); if(pill) pill.textContent = `${choice.label} • k=${k}`;
    const heroCards = qs('#hero-metric-cards');
    if(heroCards) heroCards.innerHTML = [
      metricCard('Retorno total', fmtPct(m.retorno_total), 'IBOV: '+fmtPct(m.retorno_ibov_total), true),
      metricCard('Tracking-error anual', fmtPct(m.tracking_error_anualizado), '', false),
      metricCard('Volatilidade anual', fmtPct(m.volatilidade_anualizada), '', false),
      metricCard('Correlação IBOV', fmtNum(m.correlacao_ibov,3), '', true)
    ].join('');
    const sideCards = qs('#side-stat-cards');
    if(sideCards) sideCards.innerHTML = [
      metricCard('Meses positivos', `${s.meses_positivos||'--'}/${s.meses_total||'--'}`, fmtPct((s.pct_meses_positivos||0)/100), true),
      metricCard('Acima do IBOV', `${s.meses_acima_ibov||'--'}/${s.meses_total||'--'}`, fmtPct((s.pct_meses_acima_ibov||0)/100), false),
      metricCard('Melhor mês', fmtPct(s.melhor_mes), '', true),
      metricCard('Pior mês', fmtPct(s.pior_mes), '', false)
    ].join('');
    drawPortfolioChart(); drawTreemap(); fillWeightsTable(); fillPresence(); fillMetrics(); fillModelSummary(); drawDiagnostics();
  }
  function buildPortfolioChartRows(){
    const p = data.portfolios[portfolioState.index]; const selected = p.monthlyByK[portfolioState.k] || [];
    const etfMap = {}; (data.monthlyEtfs||[]).forEach(r => etfMap[r.mes] = r);
    const ico2Best = data.portfolios.ICO2.monthlyByK[String(data.portfolios.ICO2.bestK)] || [];
    const iseBest = data.portfolios.ISE.monthlyByK[String(data.portfolios.ISE.bestK)] || [];
    const icoMap = {}; ico2Best.forEach(r => icoMap[r.mes] = r.ret_carteira);
    const iseMap = {}; iseBest.forEach(r => iseMap[r.mes] = r.ret_carteira);
    const rows = selected.map(r => ({ date:r.date, selected:r.ret_carteira, ibov:r.ret_ibov, isus11:etfMap[r.mes]?.isus11 || 0, ecoo11:etfMap[r.mes]?.ecoo11 || 0, ico2_otima:icoMap[r.mes] || 0, ise_otima:iseMap[r.mes] || 0 }));
    return returnsToCumulative(rows, ['selected','ibov','isus11','ecoo11','ico2_otima','ise_otima']);
  }
  function drawPortfolioChart(){
    const canvas = qs('#portfolio-return-chart'); if(!canvas || !window.FinorCharts || !portfolioState.index) return;
    const c = colors(); const rows = buildPortfolioChartRows(); const series=[];
    if(portfolioState.toggles.selected) series.push({key:'selected', label:`${portfolioState.index} k=${portfolioState.k}`, color:c.primary, width:2.9});
    if(portfolioState.toggles.ibov) series.push({key:'ibov', label:'IBOV', color:c.secondary, width:1.9, dash:[6,5], alpha:.82});
    if(portfolioState.toggles.etfs){ series.push({key:'isus11', label:'ISUS11', color:c.line3, width:1.6, dash:[3,5]}); series.push({key:'ecoo11', label:'ECOO11', color:c.line4, width:1.6, dash:[8,5]}); }
    if(portfolioState.toggles.otimas){ series.push({key:'ico2_otima', label:'ICO2 ótima', color:c.line5, width:2, dash:[10,4]}); series.push({key:'ise_otima', label:'ISE ótima', color:c.muted, width:2, dash:[2,4]}); }
    if(!series.length) { FinorCharts.message(canvas, 'Ative pelo menos uma série.'); return; }
    FinorCharts.lineChart(canvas, rows, { percent:true, limit:220, series });
  }

  function squarify(items, x, y, w, h){
    const total = items.reduce((a,b)=>a+b.value,0) || 1;
    const scale = w*h/total;
    const rects = [];
    const list = items.map(i => ({...i, area:i.value*scale})).sort((a,b)=>b.area-a.area);
    function worst(row, side){
      if(!row.length) return Infinity;
      const sum = row.reduce((a,b)=>a+b.area,0), max = Math.max(...row.map(r=>r.area)), min = Math.min(...row.map(r=>r.area));
      return Math.max((side*side*max)/(sum*sum), (sum*sum)/(side*side*min));
    }
    function layout(row){
      const sum = row.reduce((a,b)=>a+b.area,0);
      if(w >= h){ const rh = sum/w; let cx=x; row.forEach(r=>{ const rw=r.area/rh; rects.push({...r,x:cx,y,w:rw,h:rh}); cx+=rw; }); y+=rh; h-=rh; }
      else { const rw = sum/h; let cy=y; row.forEach(r=>{ const rh=r.area/rw; rects.push({...r,x,y:cy,w:rw,h:rh}); cy+=rh; }); x+=rw; w-=rw; }
    }
    let row=[]; let side = Math.min(w,h);
    while(list.length){ const item=list[0]; if(!row.length || worst([...row,item], side) <= worst(row, side)){ row.push(item); list.shift(); } else { layout(row); row=[]; side=Math.min(w,h); } }
    if(row.length) layout(row);
    return rects;
  }
  function drawTreemap(){
    const el = qs('#portfolio-treemap'); if(!el) return;
    const p = data.portfolios[portfolioState.index];
    const rows = p.weightsByK[portfolioState.k] || [];
    const items = rows.map(r=>{ const raw = Number(r.peso||0); return { label:assetLabel(r.ativo), setor:industryLabel(r), value:Math.max(raw, 0.012), displayValue:raw }; });
    const rect = el.getBoundingClientRect(); const w = Math.max(320, rect.width || 900), h = Math.max(360, rect.height || 520);
    const nodes = squarify(items,0,0,w,h);
    el.innerHTML = nodes.map((n)=>{
      const tiny = n.w < 58 || n.h < 36;
      const small = n.w < 98 || n.h < 68;
      const alpha = Math.min(.88, .16 + (n.displayValue*2.9));
      return `<div class="tree-node" title="${n.label} • ${industryLabel(n)} • ${fmtPct(n.displayValue)}" style="left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${n.h}px;background:rgba(255,90,25,${alpha});"><div><strong class="font-geist-mono ${tiny?'text-[10px]':small?'text-xs':'text-lg'}">${n.label}</strong>${small?'':`<p class="mt-1 text-xs opacity-75">${n.setor}</p>`}</div><span class="font-geist-mono ${tiny?'text-[9px]':small?'text-[10px]':'text-sm'}">${fmtPct(n.displayValue)}</span></div>`;
    }).join('');
  }
  function fillWeightsTable(){
    const tbody = qs('#weights-table'); if(!tbody) return;
    const p = data.portfolios[portfolioState.index]; const rows = p.weightsByK[portfolioState.k] || [];
    tbody.innerHTML = rows.map(r => `<tr class="border-t border-chumbo/5 dark:border-white/10"><td class="py-3 font-geist-mono font-semibold">${assetLabel(r.ativo)}</td><td class="py-3 opacity-70">${industryLabel(r)}</td><td class="py-3 text-right font-geist-mono text-laranja">${fmtPct(r.peso)}</td></tr>`).join('');
  }
  function fillPresence(){
    const p = data.portfolios[portfolioState.index]; const top = (p.assetStats || []).slice(0,10);
    const totalK = (p.ks || []).length || 16;
    const list = qs('#presence-list');
    if(list){ list.innerHTML = top.slice(0,7).map(r => `<div class="rounded-2xl bg-gelo dark:bg-white/5 p-4"><div class="flex items-center justify-between gap-3"><strong class="font-geist-mono">${assetLabel(r.ativo)}</strong><span class="text-laranja font-geist-mono">${r.presenca}/${totalK}</span></div><p class="mt-1 text-sm opacity-60">Peso médio: ${fmtPct(r.peso_medio)} • ${industryLabel(r)}</p></div>`).join(''); }
    const canvas = qs('#presence-chart');
    if(canvas && window.FinorCharts){ const c = colors(); FinorCharts.barHorizontal(canvas, top.map(r=>({label:assetLabel(r.ativo), value:r.peso_medio})), { percent:true, color:c.primary, labelKey:'label', valueKey:'value' }); }
  }
  function fillMetrics(){
    const p = data.portfolios[portfolioState.index]; const m = p.metricsByK[portfolioState.k] || {};
    const tech = qs('#technical-cards');
    if(tech) tech.innerHTML = [
      metricCard('Retorno total', fmtPct(m.retorno_total), 'Carteira selecionada', true),
      metricCard('Tracking-error diário', fmtPct(m.tracking_error_diario,2), '', false),
      metricCard('Sharpe', fmtNum(m.sharpe,3), '', true),
      metricCard('Correlação IBOV', fmtNum(m.correlacao_ibov,3), '', false)
    ].join('');
    const tbody = qs('#metrics-table'); if(!tbody) return;
    const choices = portfolioChoices(p);
    tbody.innerHTML = choices.map(ch => { const r = p.metricsByK[String(ch.k)] || {}; const active = ch.id===portfolioState.choice; return `<tr class="border-t border-chumbo/5 dark:border-white/10 ${active?'bg-laranja/10':''}"><td class="py-3 font-bold ${active?'text-laranja':''}"><span class="block">${ch.label}</span><span class="block mt-1 font-geist-mono text-xs opacity-60">k=${ch.k}</span></td><td class="py-3 text-right font-geist-mono">${fmtPct(r.retorno_total)}</td><td class="py-3 text-right font-geist-mono">${fmtPct(r.retorno_anualizado)}</td><td class="py-3 text-right font-geist-mono">${fmtPct(r.tracking_error_anualizado)}</td><td class="py-3 text-right font-geist-mono">${fmtPct(r.volatilidade_anualizada)}</td><td class="py-3 text-right font-geist-mono">${fmtNum(r.sharpe,3)}</td><td class="py-3 text-right font-geist-mono">${fmtNum(r.correlacao_ibov,3)}</td></tr>`; }).join('');
  }
  function fillModelSummary(){
    const el = qs('#model-summary-cards'); if(!el || !data.ico2Model) return;
    const m = data.ico2Model;
    el.innerHTML = [
      metricCard('R² múltiplo', fmtNum(m.r2,4), '', true), metricCard('R² ajustado', fmtNum(m.adjR2,4), '', false), metricCard('Erro residual', fmtNum(m.residualStdError,4), '', false), metricCard('F-statistic', fmtNum(m.fStatistic,1), '', true)
    ].join('');
  }

  function drawDiagnostics(){
    const scatter = qs('#diagnostic-scatter');
    const heatmap = qs('#diagnostic-heatmap');
    const residuals = qs('#diagnostic-residuals');
    const qq = qs('#diagnostic-qq');
    if(!scatter && !heatmap && !residuals && !qq) return;
    if(!window.FinorCharts) return;
    const model = data.modelDiagnostics?.[portfolioState.index];
    const missing = `Diagnósticos do modelo ${portfolioState.index || ''} ainda não carregados.`;
    if(!model){ [scatter, heatmap, residuals, qq].filter(Boolean).forEach(c => FinorCharts.message(c, missing)); return; }
    const c = colors();
    if(scatter) FinorCharts.scatterChart(scatter, model.predicoes || [], { xKey:'Observado', yKey:'Previsto', percent:true, diagonal:true, color:c.primary, alpha:.58, radius:2.2, xLabel:'Observado' });
    if(heatmap){
      const matrix = model.correlacao || {};
      const labels = (matrix.labels || []).map(assetLabel);
      FinorCharts.heatmap(heatmap, {labels, values:matrix.values || []}, { caption:'Mapa de correlação entre ativos e benchmark.' });
    }
    if(residuals) FinorCharts.scatterChart(residuals, model.diagnostics || [], { xKey:'fitted', yKey:'residuals', percent:true, zeroLine:true, color:c.primary, alpha:.54, radius:2.1, xLabel:'Valores ajustados' });
    if(qq) FinorCharts.scatterChart(qq, model.qq || [], { xKey:'theoretical', yKey:'sample', diagonal:true, color:c.primary, alpha:.58, radius:2.1, xLabel:'Quantis teóricos' });
  }

  let resizeTimer;
  function redrawAll(){ drawHome(); if(portfolioState.index){ drawPortfolioChart(); drawTreemap(); fillPresence(); drawDiagnostics(); } }
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer=setTimeout(redrawAll, 160); });
  document.addEventListener('fullscreenchange', () => setTimeout(redrawAll, 120));
  document.addEventListener('DOMContentLoaded', () => { initCommon(); initHero(); initHome(); initPortfolio(); });
})();

// =============================================================================
// FAMILYHUB — views/view-dashboard.js
// =============================================================================

// =============================================================================
// 7. VIEW — DASHBOARD (aprimorado)
// =============================================================================
function renderDashboard() {
  const hoje       = new Date().toISOString().split('T')[0];
  const atividades = DB.atividades;

  const total      = atividades.length;
  const concluidas = atividades.filter(a => a.status==='concluida').length;
  const pendentes  = atividades.filter(a => a.status==='pendente').length;
  const andamento  = atividades.filter(a => a.status==='andamento').length;
  const atrasadas  = atividades.filter(a => a.status==='pendente' && a.date<hoje).length;
  const pct        = total > 0 ? Math.round((concluidas/total)*100) : 0;

  // Atividades da próxima semana
  const semana = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()+i);
    return d.toISOString().split('T')[0];
  });
  const proxSemana = atividades.filter(a => semana.includes(a.date) && a.status!=='concluida').length;

  // Agenda do dia
  const ativHoje = atividades.filter(a => a.date===hoje).sort((a,b) => a.time.localeCompare(b.time));

  const timelineHTML = ativHoje.length > 0
    ? ativHoje.map(item => {
        const isConcluida = item.status==='concluida';
        return `<div class="relative pl-8 pb-5 border-l border-border-light dark:border-border-dark last:border-transparent last:pb-0">
          <div class="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full ${isConcluida ? 'bg-slate-400' : 'bg-brand-main'} ring-4 ring-white dark:ring-slate-900"></div>
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1">
              <h4 class="text-[14px] font-semibold ${isConcluida ? 'line-through text-slate-400' : ''}">${item.title}</h4>
              <div class="flex flex-wrap items-center gap-2 mt-1">
                <span class="text-[11px] font-extrabold px-2 py-0.5 rounded border ${item.color}">${item.tag}</span>
                <span class="text-[12px] text-slate-400 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i>${item.time}</span>
                <span class="text-[12px] text-slate-400">${item.resp}</span>
              </div>
            </div>
            <button onclick="toggleStatusAtividade(${item.id})" title="Marcar concluída"
              class="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all
              ${isConcluida ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-brand-main'}">
              ${isConcluida ? '<i data-lucide="check" class="w-3 h-3"></i>' : ''}
            </button>
          </div></div>`;
      }).join('')
    : `<div class="text-center py-6"><i data-lucide="sun" class="w-8 h-8 mx-auto mb-2 text-amber-400 opacity-70"></i>
        <p class="text-slate-500 text-sm font-medium">Dia livre! Nenhuma atividade hoje.</p></div>`;

  // Faixa semanal
  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()+i);
    const dateStr = d.toISOString().split('T')[0];
    const count   = atividades.filter(a => a.date===dateStr).length;
    const conclStr= atividades.filter(a => a.date===dateStr && a.status==='concluida').length;
    return { dateStr, count, conclStr, isToday:i===0, weekday:['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()], day:d.getDate() };
  });
  const weekStripHTML = weekDays.map(w => `
    <div class="flex flex-col items-center gap-1 cursor-pointer group"
      onclick="calMonth=${new Date(w.dateStr.split('-')[0], w.dateStr.split('-')[1]-1,1).getMonth()}; calYear=${w.dateStr.split('-')[0]}; changeView('calendario')">
      <span class="text-[10px] font-bold uppercase text-slate-400 group-hover:text-brand-main transition-colors">${w.weekday}</span>
      <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all
        ${w.isToday ? 'bg-brand-main text-white shadow-md' : 'group-hover:bg-brand-main/10 text-slate-600 dark:text-slate-300'}">${w.day}</div>
      ${w.count>0 ? `<div class="w-1.5 h-1.5 rounded-full ${w.isToday?'bg-white':'bg-brand-main'} opacity-80"></div>` : '<div class="w-1.5 h-1.5"></div>'}
    </div>`).join('');

  // Progresso circular
  const radius = 28; const circ = 2*Math.PI*radius;
  const strokeDash = `${(pct/100)*circ} ${circ}`;

  // Membros stats
  const membrosStats = DB.membros.map(m => ({
    ...m, pts: DB.gamification.pontos[m.name]||0,
    tarefas: atividades.filter(a => a.resp===m.name && a.status==='concluida').length,
    pendentesCount: atividades.filter(a => a.resp===m.name && a.status==='pendente').length,
  })).sort((a,b) => b.pts-a.pts);
  const topMembro = membrosStats[0];

  // Resumo de listas de compras
  const totalPendentesCompras = DB.listas.reduce((s,l) => s+l.pendentes.length, 0);
  const totalNoCarrinho       = DB.listas.reduce((s,l) => s+l.carrinho.length, 0);

  // Taxa de conclusão por categoria
  const categorias = [...new Set(atividades.map(a => a.tag))];
  const catStats = categorias.map(cat => {
    const catAts = atividades.filter(a => a.tag===cat);
    const catConc = catAts.filter(a => a.status==='concluida').length;
    return { cat, total: catAts.length, concluidas: catConc, pct: catAts.length>0 ? Math.round((catConc/catAts.length)*100) : 0 };
  }).sort((a,b) => b.total - a.total).slice(0,4);

  // Mural por categoria
  const muralCategories = [
    { tag:'ESCOLA',           icon:'book-open',   color:'text-blue-500',    bg:'bg-blue-50 dark:bg-blue-900/20'     },
    { tag:'ESPORTE',          icon:'trophy',      color:'text-orange-500',  bg:'bg-orange-50 dark:bg-orange-900/20' },
    { tag:'SAÚDE',            icon:'heart-pulse', color:'text-red-500',     bg:'bg-red-50 dark:bg-red-900/20'       },
    { tag:'TAREFA DOMÉSTICA', icon:'home',        color:'text-emerald-500', bg:'bg-emerald-50 dark:bg-emerald-900/20'},
  ];
  const muralHTML = muralCategories.map(cat => {
    const tasks = atividades.filter(a => a.tag===cat.tag && a.date>=hoje && a.status!=='concluida').slice(0,3);
    if (!tasks.length) return '';
    return `<div class="bg-panel-light dark:bg-panel-dark p-5 rounded-2xl shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="font-bold text-[13px] flex items-center gap-2 mb-4 uppercase tracking-widest">
        <span class="p-1.5 rounded-lg ${cat.bg}"><i data-lucide="${cat.icon}" class="w-4 h-4 ${cat.color}"></i></span>
        <span class="text-slate-600 dark:text-slate-300">${cat.tag}</span></h3>
      <div class="space-y-2.5">
        ${tasks.map(t => { const p=priorityConfig[t.priority]||priorityConfig.media; return `
          <div class="flex items-center gap-3 p-2.5 bg-bg-light dark:bg-slate-800/50 rounded-xl">
            <div class="w-2 h-2 rounded-full flex-shrink-0 ${p.dot}"></div>
            <div class="flex-1 min-w-0">
              <p class="text-[13px] font-semibold truncate">${t.title}</p>
              <p class="text-[11px] text-slate-400 mt-0.5">${t.date.split('-').reverse().join('/')} · ${t.resp}</p>
            </div></div>`;}).join('')}
      </div></div>`;
  }).join('');

  // Progresso mensal (últimos 6 meses simulado)
  const now = new Date();
  const monthLabels = Array.from({length:6},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-5+i,1); return d.toLocaleString('pt-BR',{month:'short'});});
  const monthData = Array.from({length:6},(_,i)=>{
    const d = new Date(now.getFullYear(),now.getMonth()-5+i,1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const conc = atividades.filter(a=>a.date.startsWith(ym)&&a.status==='concluida').length;
    const tot  = atividades.filter(a=>a.date.startsWith(ym)).length;
    return {conc,tot};
  });
  const maxMonth = Math.max(...monthData.map(m=>m.tot),1);
  const chartBarsHTML = monthData.map((m,i)=>`
    <div class="flex flex-col items-center gap-1 flex-1">
      <span class="text-[9px] font-bold text-brand-main">${m.conc>0?m.conc:''}</span>
      <div class="w-full relative flex flex-col justify-end" style="height:60px">
        <div class="w-full rounded-t-lg bg-slate-100 dark:bg-slate-800 absolute bottom-0" style="height:100%"></div>
        <div class="w-full rounded-t-lg bg-brand-main/80 absolute bottom-0 transition-all duration-700" style="height:${m.tot>0?Math.round((m.conc/maxMonth)*100):0}%"></div>
        ${m.tot>0?`<div class="w-full rounded-t-lg border-2 border-dashed border-brand-main/30 absolute bottom-0" style="height:${Math.round((m.tot/maxMonth)*100)}%"></div>`:''}
      </div>
      <span class="text-[9px] text-slate-400 font-medium capitalize">${monthLabels[i]}</span>
    </div>`).join('');

  return `<div class="flex flex-col xl:flex-row gap-8 h-full items-start">
    <!-- ═══ COLUNA ESQUERDA ═══ -->
    <div class="w-full xl:w-[380px] flex flex-col gap-5 flex-shrink-0">

      <!-- Banner de boas-vindas -->
      <div class="bg-gradient-to-br from-brand-main to-[#2c5c4e] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div class="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-2xl"></div>
        <div class="absolute -left-4 -bottom-8 w-28 h-28 bg-black/10 rounded-full blur-xl"></div>
        <div class="relative z-10 flex items-start justify-between gap-4">
          <div class="flex-1">
            <p class="text-emerald-200 text-[11px] font-bold uppercase tracking-widest mb-1">
              ${new Date().toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'})}
            </p>
            <h3 class="text-2xl font-bold mb-4">${DB.settings.familyName} 👋</h3>
            <div class="flex gap-2 flex-wrap">
              <button onclick="openModal('formAtividade')"
                class="bg-white text-brand-main px-4 py-2 rounded-xl font-bold text-[13px] hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
                <i data-lucide="plus" class="w-4 h-4"></i> Atividade</button>
              <button onclick="changeView('estatisticas')"
                class="bg-white/20 text-white px-4 py-2 rounded-xl font-bold text-[13px] hover:bg-white/30 transition-colors flex items-center gap-2">
                <i data-lucide="bar-chart-2" class="w-4 h-4"></i> Stats</button>
            </div>
          </div>
          <div class="flex flex-col items-center">
            <svg width="70" height="70" viewBox="0 0 70 70" class="-rotate-90">
              <circle cx="35" cy="35" r="${radius}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="5"/>
              <circle cx="35" cy="35" r="${radius}" fill="none" stroke="white" stroke-width="5"
                stroke-dasharray="${strokeDash}" stroke-linecap="round" class="transition-all duration-1000"/>
            </svg>
            <div class="text-center -mt-14"><p class="text-xl font-black">${pct}%</p><p class="text-[9px] text-emerald-200 uppercase tracking-wider">feito</p></div>
          </div>
        </div>
      </div>

      <!-- Faixa semanal -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl px-4 py-3 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex justify-between items-center">${weekStripHTML}</div>
      </div>

      <!-- Cards de stats – grade 2x2 melhorada -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-panel-light dark:bg-panel-dark rounded-xl p-4 border border-border-light dark:border-border-dark shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg"><i data-lucide="clock" class="w-4 h-4 text-amber-500"></i></div>
            <p class="text-2xl font-black text-amber-500">${pendentes}</p>
          </div>
          <p class="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Pendentes</p>
        </div>
        <div class="bg-panel-light dark:bg-panel-dark rounded-xl p-4 border border-border-light dark:border-border-dark shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><i data-lucide="loader" class="w-4 h-4 text-blue-500"></i></div>
            <p class="text-2xl font-black text-blue-500">${andamento}</p>
          </div>
          <p class="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Andamento</p>
        </div>
        <div class="bg-panel-light dark:bg-panel-dark rounded-xl p-4 border border-border-light dark:border-border-dark shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"><i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i></div>
            <p class="text-2xl font-black text-emerald-500">${concluidas}</p>
          </div>
          <p class="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Concluídas</p>
        </div>
        <div class="bg-panel-light dark:bg-panel-dark rounded-xl p-4 border border-border-light dark:border-border-dark shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <div class="p-2 ${atrasadas>0?'bg-red-50 dark:bg-red-900/20':'bg-slate-50 dark:bg-slate-800'} rounded-lg"><i data-lucide="alert-triangle" class="w-4 h-4 ${atrasadas>0?'text-red-500':'text-slate-400'}"></i></div>
            <p class="text-2xl font-black ${atrasadas>0?'text-red-500':'text-slate-400'}">${atrasadas}</p>
          </div>
          <p class="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Atrasadas</p>
        </div>
      </div>

      <!-- Gráfico de barras mensal -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i data-lucide="bar-chart-2" class="w-3.5 h-3.5"></i> Progresso Mensal
          </h3>
          <div class="flex items-center gap-3 text-[9px] font-bold">
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-brand-main/80 inline-block"></span>Concluídas</span>
            <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm border-2 border-dashed border-brand-main/50 inline-block"></span>Total</span>
          </div>
        </div>
        <div class="flex items-end gap-1.5">${chartBarsHTML}</div>
      </div>

      <!-- Destaques rápidos -->
      <div class="grid grid-cols-2 gap-3">
        ${topMembro ? `
        <div class="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-xl p-3.5 border border-amber-200 dark:border-amber-800/40">
          <p class="text-[9px] font-extrabold uppercase tracking-widest text-amber-500 mb-2">🏆 Líder</p>
          <div class="flex items-center gap-2">
            <img src="${topMembro.photo||'https://ui-avatars.com/api/?name='+encodeURIComponent(topMembro.name)}" class="w-8 h-8 rounded-full object-cover">
            <div><p class="text-[13px] font-bold truncate">${topMembro.name}</p><p class="text-[10px] text-amber-600 font-bold">${topMembro.pts} pts</p></div>
          </div></div>` : '<div></div>'}
        <div class="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-3.5 border border-blue-200 dark:border-blue-800/40">
          <p class="text-[9px] font-extrabold uppercase tracking-widest text-blue-500 mb-2">🛒 Compras</p>
          <p class="text-xl font-black text-blue-600">${totalPendentesCompras}</p>
          <p class="text-[10px] text-blue-500 font-semibold">${totalNoCarrinho} no carrinho</p>
        </div>
      </div>

      <!-- Próxima semana info -->
      ${proxSemana > 0 ? `
      <div class="bg-panel-light dark:bg-panel-dark rounded-xl p-3.5 border border-border-light dark:border-border-dark shadow-sm flex items-center gap-3">
        <div class="p-2 bg-brand-main/10 rounded-lg"><i data-lucide="calendar" class="w-4 h-4 text-brand-main"></i></div>
        <div><p class="text-[13px] font-bold">${proxSemana} atividade${proxSemana>1?'s':''} essa semana</p>
          <p class="text-[11px] text-slate-400">Próximos 7 dias</p></div>
        <button onclick="changeView('calendario')" class="ml-auto text-brand-main hover:underline text-[12px] font-bold">Ver →</button>
      </div>` : ''}

      <!-- Desempenho por membro -->
      ${DB.membros.length > 0 ? `
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i data-lucide="users" class="w-3.5 h-3.5"></i> Desempenho
          </h3>
          <button onclick="changeView('ranking')" class="text-brand-main text-[11px] font-bold hover:underline">Ranking →</button>
        </div>
        <div class="space-y-3">
          ${membrosStats.map(m => `
          <div class="flex items-center gap-3">
            <img src="${m.photo||'https://ui-avatars.com/api/?name='+encodeURIComponent(m.name)}" class="w-7 h-7 rounded-full object-cover flex-shrink-0">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <p class="text-[12px] font-semibold truncate">${m.name}</p>
                <span class="text-[11px] font-bold text-brand-main">${m.tarefas} ✓</span>
              </div>
              <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-brand-main to-emerald-400 transition-all duration-700" style="width:${total>0?Math.round((m.tarefas/total)*100):0}%"></div>
              </div>
            </div>
          </div>`).join('')}
        </div>
      </div>` : ''}

      <!-- Agenda de Hoje -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 shadow-sm border border-border-light dark:border-border-dark">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <i data-lucide="clock" class="w-3.5 h-3.5"></i> Agenda de Hoje
          </h3>
          <span class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">${ativHoje.length} eventos</span>
        </div>
        ${timelineHTML}
      </div>
    </div>

    <!-- ═══ COLUNA DIREITA ═══ -->
    <div class="flex-1 w-full space-y-6">

      <!-- Taxa de conclusão por categoria -->
      ${catStats.length > 0 ? `
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">Por Categoria</h3>
          <button onclick="changeView('atividades')" class="text-brand-main text-sm font-bold hover:underline">Ver todas →</button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${catStats.map(cs => `
          <div class="bg-panel-light dark:bg-panel-dark rounded-xl p-4 border border-border-light dark:border-border-dark shadow-sm text-center">
            <div class="relative inline-flex items-center justify-center w-14 h-14 mb-3">
              <svg width="56" height="56" viewBox="0 0 56 56" class="-rotate-90">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" stroke-width="4"/>
                <circle cx="28" cy="28" r="22" fill="none" stroke="#438370" stroke-width="4"
                  stroke-dasharray="${(cs.pct/100)*(2*Math.PI*22)} ${2*Math.PI*22}" stroke-linecap="round"/>
              </svg>
              <span class="absolute text-[11px] font-black text-brand-main">${cs.pct}%</span>
            </div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">${cs.cat}</p>
            <p class="text-[11px] text-slate-400">${cs.concluidas}/${cs.total}</p>
          </div>`).join('')}
        </div>
      </div>` : ''}

      <!-- Mural da tribo -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">Mural da Tribo</h3>
          <button onclick="changeView('atividades')" class="text-brand-main text-sm font-bold hover:underline flex items-center gap-1">
            Ver tudo <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i></button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          ${muralHTML || `<div class="col-span-2 text-center py-12 text-slate-400">
            <i data-lucide="party-popper" class="w-12 h-12 mx-auto mb-3 opacity-30"></i>
            <p class="font-medium">Tudo em dia! Nenhum evento futuro.</p></div>`}
        </div>
      </div>

      <!-- Visão geral das receitas -->
      ${DB.receitas.length > 0 ? `
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold">Receitas da Família</h3>
          <button onclick="changeView('receitas')" class="text-brand-main text-sm font-bold hover:underline">Ver todas →</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${DB.receitas.slice(0,2).map(r => `
          <div class="bg-panel-light dark:bg-panel-dark rounded-2xl overflow-hidden shadow-sm border border-border-light dark:border-border-dark flex">
            <img src="${r.img}" alt="${r.title}" class="w-20 h-20 object-cover flex-shrink-0">
            <div class="p-3 flex-1 min-w-0">
              <p class="font-bold text-[13px] truncate">${r.title}</p>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="text-[10px] bg-brand-main/10 text-brand-main font-bold px-1.5 py-0.5 rounded">${r.tag}</span>
                <span class="text-[10px] text-slate-400 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i>${r.time}</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-1">${r.diff} · ${r.porcoes} porções</p>
            </div>
          </div>`).join('')}
        </div>
      </div>` : ''}
    </div>
  </div>`;
}
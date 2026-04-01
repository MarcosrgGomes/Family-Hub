// =============================================================================
// FAMILYHUB — views/view-estatisticas.js
// =============================================================================

// =============================================================================
// 13. VIEW — ESTATÍSTICAS (nova página)
// =============================================================================
function renderEstatisticas() {
  const hoje = new Date().toISOString().split('T')[0];
  const semanaPassada = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
  const mesPassado    = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
  const atividades    = DB.atividades;

  // ─── Métricas gerais ─────────────────────────────────────
  const total       = atividades.length;
  const concluidas  = atividades.filter(a=>a.status==='concluida').length;
  const pendentes   = atividades.filter(a=>a.status==='pendente').length;
  const andamento   = atividades.filter(a=>a.status==='andamento').length;
  const atrasadas   = atividades.filter(a=>a.status==='pendente'&&a.date<hoje).length;
  const pct         = total>0?Math.round((concluidas/total)*100):0;
  const semana      = atividades.filter(a=>a.date>=semanaPassada&&a.status==='concluida').length;
  const mes         = atividades.filter(a=>a.date>=mesPassado&&a.status==='concluida').length;

  // ─── Por categoria ───────────────────────────────────────
  const cats = ['TAREFA DOMÉSTICA','ESCOLA','ESPORTE','SAÚDE','SOCIAL'];
  const catColors = {'TAREFA DOMÉSTICA':'bg-emerald-500','ESCOLA':'bg-blue-500','ESPORTE':'bg-orange-500','SAÚDE':'bg-red-500','SOCIAL':'bg-purple-500'};
  const catData = cats.map(cat => ({
    tag: cat,
    total: atividades.filter(a=>a.tag===cat).length,
    concluidas: atividades.filter(a=>a.tag===cat&&a.status==='concluida').length,
    color: catColors[cat]||'bg-slate-500',
  }));
  const maxCat = Math.max(...catData.map(c=>c.total), 1);

  // ─── Por membro ──────────────────────────────────────────
  const membroData = DB.membros.map(m => ({
    name: m.name, photo: m.photo, borderHex: m.borderHex,
    total:     atividades.filter(a=>a.resp===m.name).length,
    concluidas:atividades.filter(a=>a.resp===m.name&&a.status==='concluida').length,
    pendentes: atividades.filter(a=>a.resp===m.name&&a.status==='pendente').length,
    pts:       DB.gamification.pontos[m.name]||0,
    streak:    DB.gamification.streaks[m.name]||0,
    conquistas:DB.gamification.conquistas.filter(c=>c.memberId===m.name).length,
  })).sort((a,b)=>b.total-a.total);
  const maxMembro = Math.max(...membroData.map(m=>m.total), 1);

  // ─── Últimos 7 dias (atividades concluídas por dia) ──────
  const last7 = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()-6+i);
    const ds= d.toISOString().split('T')[0];
    return {
      day: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()],
      date: ds,
      count: atividades.filter(a=>a.date===ds&&a.status==='concluida').length,
    };
  });
  const maxDay = Math.max(...last7.map(d=>d.count), 1);

  // ─── Prioridades ─────────────────────────────────────────
  const prioData = [
    { label:'Urgente', count:atividades.filter(a=>a.priority==='urgente').length, color:'bg-red-600',   dot:'bg-red-600' },
    { label:'Alta',    count:atividades.filter(a=>a.priority==='alta').length,    color:'bg-red-400',   dot:'bg-red-400' },
    { label:'Média',   count:atividades.filter(a=>a.priority==='media').length,   color:'bg-amber-400', dot:'bg-amber-400' },
    { label:'Baixa',   count:atividades.filter(a=>a.priority==='baixa').length,   color:'bg-slate-300', dot:'bg-slate-300' },
  ];
  const maxPrio = Math.max(...prioData.map(p=>p.count), 1);

  // ─── Gamificação stats ───────────────────────────────────
  const totalPts   = Object.values(DB.gamification.pontos).reduce((a,b)=>a+b, 0);
  const totalConq  = DB.gamification.conquistas.length;
  const maxStreak  = Math.max(...Object.values(DB.gamification.streaks), 0);
  const topStreakM  = Object.entries(DB.gamification.streaks).sort((a,b)=>b[1]-a[1])[0];

  // ─── Listas stats ────────────────────────────────────────
  const totalListasItens = DB.listas.reduce((s,l)=>s+l.pendentes.length+l.carrinho.length, 0);
  const totalComprados   = DB.listas.reduce((s,l)=>s+l.carrinho.length, 0);
  const pctCompras       = totalListasItens>0?Math.round((totalComprados/totalListasItens)*100):0;

  return `<div class="max-w-6xl mx-auto space-y-8 pb-10">

    <!-- ─── Hero Stats ─── -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      ${[
        {label:'Total de Tarefas', val:total,     icon:'list',         color:'text-slate-700 dark:text-white',  bg:'from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900'},
        {label:'Concluídas',       val:concluidas, icon:'check-circle-2',color:'text-emerald-600',              bg:'from-emerald-50 to-emerald-100/30 dark:from-emerald-900/30 dark:to-emerald-900/10'},
        {label:'Taxa de Conclusão',val:pct+'%',   icon:'percent',      color:'text-brand-main',                 bg:'from-teal-50 to-teal-100/30 dark:from-teal-900/30 dark:to-teal-900/10'},
        {label:'Em Atraso',        val:atrasadas,  icon:'alert-triangle',color:atrasadas>0?'text-red-500':'text-slate-400', bg:atrasadas>0?'from-red-50 to-red-100/30 dark:from-red-900/30 dark:to-red-900/10':'from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900'},
      ].map(s=>`<div class="bg-gradient-to-br ${s.bg} rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
        <i data-lucide="${s.icon}" class="w-5 h-5 ${s.color} mb-3"></i>
        <p class="text-3xl font-black ${s.color} leading-none">${s.val}</p>
        <p class="text-[11px] text-slate-500 font-semibold mt-1.5 uppercase tracking-wide">${s.label}</p>
      </div>`).join('')}
    </div>

    <!-- ─── Segunda linha de stats ─── -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      ${[
        {label:'Concluídas esta semana', val:semana,        icon:'calendar-check', color:'text-blue-600',   bg:'bg-blue-50 dark:bg-blue-900/20'},
        {label:'Concluídas este mês',    val:mes,           icon:'calendar',       color:'text-purple-600', bg:'bg-purple-50 dark:bg-purple-900/20'},
        {label:'Membros ativos',         val:DB.membros.length, icon:'users',      color:'text-teal-600',   bg:'bg-teal-50 dark:bg-teal-900/20'},
        {label:'Pontos totais da família',val:totalPts,     icon:'star',           color:'text-amber-600',  bg:'bg-amber-50 dark:bg-amber-900/20'},
      ].map(s=>`<div class="${s.bg} rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
        <div class="flex items-center gap-2 mb-2"><i data-lucide="${s.icon}" class="w-4 h-4 ${s.color}"></i></div>
        <p class="text-2xl font-black ${s.color}">${s.val}</p>
        <p class="text-[11px] text-slate-500 font-medium mt-0.5">${s.label}</p>
      </div>`).join('')}
    </div>

    <!-- ─── Gráfico: Atividades por dia (últimos 7 dias) ─── -->
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-base font-bold mb-1 flex items-center gap-2">
        <i data-lucide="trending-up" class="w-5 h-5 text-brand-main"></i> Tarefas Concluídas — Últimos 7 dias
      </h3>
      <p class="text-[12px] text-slate-400 mb-6">Atividades marcadas como concluídas por dia</p>
      <div class="flex items-end gap-3 h-40">
        ${last7.map(d=>{
          const heightPct = maxDay > 0 ? Math.round((d.count/maxDay)*100) : 0;
          const isToday = d.date===hoje;
          return `<div class="flex-1 flex flex-col items-center gap-2">
            <span class="text-[11px] font-bold ${d.count>0?'text-brand-main':'text-slate-400'}">${d.count||''}</span>
            <div class="w-full rounded-t-xl transition-all duration-700 ${isToday?'bg-brand-main':'bg-slate-200 dark:bg-slate-700'}"
              style="height:${Math.max(heightPct,4)}%; min-height:4px; max-height:100%"></div>
            <span class="text-[10px] font-bold ${isToday?'text-brand-main':'text-slate-400'}">${d.day}</span>
          </div>`;}).join('')}
      </div>
    </div>

    <!-- ─── Duas colunas ─── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Atividades por categoria -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
        <h3 class="text-base font-bold mb-5 flex items-center gap-2">
          <i data-lucide="tag" class="w-5 h-5 text-brand-main"></i> Por Categoria
        </h3>
        <div class="space-y-4">
          ${catData.map(c=>{
            const pctCat = c.total>0?Math.round((c.concluidas/c.total)*100):0;
            const barWidth = Math.round((c.total/maxCat)*100);
            return `<div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[13px] font-semibold">${c.tag}</span>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-slate-400">${c.concluidas}/${c.total}</span>
                  <span class="text-[11px] font-bold text-brand-main">${pctCat}%</span>
                </div>
              </div>
              <div class="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="${c.color} h-full rounded-full transition-all duration-700" style="width:${barWidth}%"></div>
              </div>
            </div>`;}).join('')}
          ${catData.every(c=>c.total===0)?`<div class="text-center py-8 text-slate-400 text-sm">Sem atividades ainda.</div>`:''}
        </div>
      </div>

      <!-- Atividades por membro -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
        <h3 class="text-base font-bold mb-5 flex items-center gap-2">
          <i data-lucide="users" class="w-5 h-5 text-brand-main"></i> Por Membro
        </h3>
        <div class="space-y-4">
          ${membroData.map(m=>{
            const pctM = m.total>0?Math.round((m.concluidas/m.total)*100):0;
            const barWidth = Math.round((m.total/maxMembro)*100);
            return `<div>
              <div class="flex items-center gap-3 mb-1.5">
                <img src="${m.photo||'https://ui-avatars.com/api/?name='+encodeURIComponent(m.name)}" class="w-7 h-7 rounded-full object-cover border-2" style="border-color:${m.borderHex}">
                <span class="text-[13px] font-semibold flex-1">${m.name}</span>
                <span class="text-[11px] text-slate-400">${m.concluidas}/${m.total}</span>
                <span class="text-[11px] font-bold" style="color:${m.borderHex}">${pctM}%</span>
              </div>
              <div class="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-700" style="width:${barWidth}%; background-color:${m.borderHex}"></div>
              </div>
            </div>`;}).join('')}
          ${membroData.length===0?`<div class="text-center py-8 text-slate-400 text-sm">Adicione membros para ver a análise.</div>`:''}
        </div>
      </div>
    </div>

    <!-- ─── Prioridades + Gamificação ─── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Distribuição de prioridades -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
        <h3 class="text-base font-bold mb-5 flex items-center gap-2">
          <i data-lucide="signal" class="w-5 h-5 text-brand-main"></i> Distribuição de Prioridades
        </h3>
        <div class="space-y-3">
          ${prioData.map(p=>{
            const bar = Math.round((p.count/maxPrio)*100);
            return `<div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full ${p.dot} flex-shrink-0"></div>
              <span class="text-[13px] font-medium w-20">${p.label}</span>
              <div class="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="${p.color} h-full rounded-full transition-all duration-700" style="width:${bar}%"></div>
              </div>
              <span class="text-[12px] font-bold text-slate-600 dark:text-slate-400 w-6 text-right">${p.count}</span>
            </div>`;}).join('')}
        </div>
      </div>

      <!-- Stats de gamificação -->
      <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
        <h3 class="text-base font-bold mb-5 flex items-center gap-2">
          <i data-lucide="trophy" class="w-5 h-5 text-amber-500"></i> Gamificação
        </h3>
        <div class="grid grid-cols-2 gap-4 mb-4">
          ${[
            {label:'Pontos totais',    val:totalPts,  icon:'star',    color:'text-amber-500',   bg:'bg-amber-50 dark:bg-amber-900/20'},
            {label:'Conquistas',       val:totalConq, icon:'award',   color:'text-purple-500',  bg:'bg-purple-50 dark:bg-purple-900/20'},
            {label:'Maior sequência',  val:maxStreak, icon:'flame',   color:'text-orange-500',  bg:'bg-orange-50 dark:bg-orange-900/20'},
            {label:'Prêmios resgatados',val:DB.gamification.premios_resgatados.length, icon:'gift', color:'text-rose-500', bg:'bg-rose-50 dark:bg-rose-900/20'},
          ].map(s=>`<div class="${s.bg} rounded-xl p-3">
            <i data-lucide="${s.icon}" class="w-4 h-4 ${s.color} mb-1.5"></i>
            <p class="text-xl font-black ${s.color}">${s.val}</p>
            <p class="text-[10px] text-slate-500 font-medium mt-0.5">${s.label}</p>
          </div>`).join('')}
        </div>
        ${topStreakM?`<div class="bg-amber-50/50 dark:bg-amber-900/10 rounded-xl p-3 border border-amber-100 dark:border-amber-900/20">
          <p class="text-[11px] text-amber-500 font-bold uppercase tracking-widest mb-1">🔥 Maior sequência ativa</p>
          <p class="font-bold text-[14px]">${topStreakM[0]} — ${topStreakM[1]} dias seguidos</p>
        </div>`:''}
      </div>
    </div>

    <!-- ─── Listas de Compras ─── -->
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-base font-bold mb-5 flex items-center gap-2">
        <i data-lucide="shopping-cart" class="w-5 h-5 text-brand-main"></i> Listas de Compras
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        ${[
          {label:'Total de listas',   val:DB.listas.length,       icon:'clipboard-list', color:'text-slate-600 dark:text-slate-300'},
          {label:'Itens pendentes',   val:DB.listas.reduce((s,l)=>s+l.pendentes.length,0), icon:'clock', color:'text-amber-600'},
          {label:'Itens comprados',   val:totalComprados,         icon:'check-circle',   color:'text-emerald-600'},
        ].map(s=>`<div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center gap-3">
          <div class="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm"><i data-lucide="${s.icon}" class="w-4 h-4 ${s.color}"></i></div>
          <div><p class="text-xl font-black ${s.color}">${s.val}</p><p class="text-[11px] text-slate-400 font-medium">${s.label}</p></div>
        </div>`).join('')}
      </div>
      <div class="flex items-center gap-3">
        <span class="text-[13px] text-slate-600 dark:text-slate-300 font-medium">Progresso geral das compras:</span>
        <div class="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full bg-emerald-400 rounded-full transition-all" style="width:${pctCompras}%"></div>
        </div>
        <span class="text-[13px] font-black text-emerald-600">${pctCompras}%</span>
      </div>
    </div>

    <!-- ─── Resumo de membros detalhado ─── -->
    <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-6 shadow-sm border border-border-light dark:border-border-dark">
      <h3 class="text-base font-bold mb-5 flex items-center gap-2">
        <i data-lucide="user-check" class="w-5 h-5 text-brand-main"></i> Desempenho dos Membros
      </h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border-light dark:border-border-dark">
              <th class="text-left py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Membro</th>
              <th class="text-center py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total</th>
              <th class="text-center py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Concluídas</th>
              <th class="text-center py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pendentes</th>
              <th class="text-center py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pontos</th>
              <th class="text-center py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Seq.</th>
              <th class="text-center py-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conquistas</th>
            </tr>
          </thead>
          <tbody>
            ${membroData.map(m=>{
              const pctM=m.total>0?Math.round((m.concluidas/m.total)*100):0;
              return `<tr class="border-b border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-3 px-3"><div class="flex items-center gap-2">
                  <img src="${m.photo||'https://ui-avatars.com/api/?name='+encodeURIComponent(m.name)}" class="w-7 h-7 rounded-full object-cover">
                  <span class="font-semibold">${m.name}</span></div></td>
                <td class="text-center py-3 px-3 font-bold">${m.total}</td>
                <td class="text-center py-3 px-3"><span class="text-emerald-600 font-bold">${m.concluidas}</span>
                  <span class="text-[10px] text-slate-400 ml-1">${pctM}%</span></td>
                <td class="text-center py-3 px-3 text-amber-600 font-bold">${m.pendentes}</td>
                <td class="text-center py-3 px-3 text-amber-500 font-black">${m.pts}</td>
                <td class="text-center py-3 px-3">${m.streak>=3?`<span class="text-orange-500 font-bold">🔥 ${m.streak}</span>`:`<span class="text-slate-400">${m.streak}</span>`}</td>
                <td class="text-center py-3 px-3 text-purple-500 font-bold">${m.conquistas}</td>
              </tr>`;}).join('')}
            ${membroData.length===0?`<tr><td colspan="7" class="text-center py-8 text-slate-400">Nenhum membro cadastrado.</td></tr>`:''}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}
// =============================================================================
// FAMILYHUB — views/view-atividades.js
// =============================================================================

// =============================================================================
// 9. VIEW — ATIVIDADES (mantida + pequenas melhorias)
// =============================================================================
function renderAtividades() {
  const hoje = new Date().toISOString().split('T')[0];
  const total     = DB.atividades.length;
  const concluidas= DB.atividades.filter(a=>a.status==='concluida').length;
  const pendentes = DB.atividades.filter(a=>a.status==='pendente').length;
  const andamento = DB.atividades.filter(a=>a.status==='andamento').length;
  const atrasadas = DB.atividades.filter(a=>a.status==='pendente'&&a.date<hoje).length;
  const pct = total>0?Math.round((concluidas/total)*100):0;

  const resumoHTML = `<div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 shadow-sm border border-border-light dark:border-border-dark mb-6">
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-bold">Progresso Geral</span>
      <span class="text-sm font-black text-brand-main">${pct}% concluído</span>
    </div>
    <div class="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
      <div class="h-full bg-gradient-to-r from-brand-main to-emerald-400 rounded-full transition-all duration-700" style="width:${pct}%"></div>
    </div>
    <div class="grid grid-cols-4 gap-3">
      ${[{label:'Total',val:total,color:'text-slate-700 dark:text-slate-200',bg:'bg-slate-100 dark:bg-slate-800',icon:'list'},
         {label:'Pendentes',val:pendentes,color:'text-amber-600',bg:'bg-amber-50 dark:bg-amber-900/20',icon:'clock'},
         {label:'Andamento',val:andamento,color:'text-blue-600',bg:'bg-blue-50 dark:bg-blue-900/20',icon:'loader'},
         {label:'Concluídas',val:concluidas,color:'text-emerald-600',bg:'bg-emerald-50 dark:bg-emerald-900/20',icon:'check-circle-2'},
        ].map(s=>`<div class="flex items-center gap-2.5 p-3 ${s.bg} rounded-xl">
          <i data-lucide="${s.icon}" class="w-4 h-4 ${s.color} flex-shrink-0"></i>
          <div><p class="text-lg font-black ${s.color} leading-none">${s.val}</p>
          <p class="text-[10px] text-slate-400 font-semibold mt-0.5">${s.label}</p></div></div>`).join('')}
    </div>
    ${atrasadas>0?`<div class="mt-3 flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-900/40">
      <i data-lucide="alert-triangle" class="w-4 h-4 text-red-500 flex-shrink-0"></i>
      <p class="text-[13px] text-red-600 dark:text-red-400 font-semibold">${atrasadas} atividade${atrasadas>1?'s':''} em atraso!</p>
      <button onclick="filterAtividadesStatus='pendente'; renderApp()" class="ml-auto text-[11px] text-red-500 font-bold underline">Ver</button>
    </div>`:''}
  </div>`;

  const cats = ['Todas','Tarefa Doméstica','Escola','Esporte','Saúde','Social'];
  const filterCatHtml = cats.map(c=>`<button onclick="filterAtividades='${c}'; renderApp()"
    class="px-4 py-1.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap
    ${filterAtividades===c?'bg-brand-main text-white shadow-md':'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-border-light dark:border-border-dark hover:border-brand-main/50'}">${c}</button>`).join('');

  const statusOpts=[{v:'Todas',l:'Todos',icon:'layers'},{v:'pendente',l:'Pendente',icon:'clock'},{v:'andamento',l:'Andamento',icon:'loader'},{v:'concluida',l:'Concluída',icon:'check-circle-2'}];
  const filterStatusHtml=statusOpts.map(s=>`<button onclick="filterAtividadesStatus='${s.v}'; renderApp()"
    class="px-4 py-1.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5
    ${filterAtividadesStatus===s.v?'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-md':'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-border-light dark:border-border-dark'}">
    <i data-lucide="${s.icon}" class="w-3 h-3"></i> ${s.l}</button>`).join('');

  const prioOpts=['Todas','baixa','media','alta','urgente'];
  const filterPrioHtml=prioOpts.map(p=>{const cfg=p==='Todas'?{label:'Prioridade',dot:'bg-slate-300'}:priorityConfig[p]; return `<button onclick="filterAtividadesPrioridade='${p}'; renderApp()"
    class="px-4 py-1.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5
    ${filterAtividadesPrioridade===p?'bg-slate-700 text-white shadow-md':'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-border-light dark:border-border-dark'}">
    <div class="w-2 h-2 rounded-full ${cfg.dot||'bg-slate-400'}"></div> ${cfg.label||'Todas'}</button>`;}).join('');

  const selectClass='px-3 py-2 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium focus:outline-none focus:border-brand-main';
  const membrosOpts=['Todos',...DB.membros.map(m=>m.name)].map(m=>`<option ${filterAtividadesMembro===m?'selected':''}>${m}</option>`).join('');
  const sortOpts=[{v:'data',l:'Por Data'},{v:'titulo',l:'Por Título'},{v:'resp',l:'Por Responsável'},{v:'prio',l:'Por Prioridade'}].map(o=>`<option value="${o.v}" ${sortAtividades===o.v?'selected':''}>${o.l}</option>`).join('');

  let filtered = DB.atividades.filter(a => {
    if (filterAtividades!=='Todas' && a.tag!==filterAtividades.toUpperCase()) return false;
    if (filterAtividadesMembro!=='Todos' && a.resp!==filterAtividadesMembro) return false;
    if (filterAtividadesStatus!=='Todas' && a.status!==filterAtividadesStatus) return false;
    if (filterAtividadesPrioridade!=='Todas' && a.priority!==filterAtividadesPrioridade) return false;
    if (searchAtividades) {
      const q=searchAtividades.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.resp.toLowerCase().includes(q) && !(a.notes||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const prioOrder={urgente:0,alta:1,media:2,baixa:3};
  const sorters={data:(a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time),titulo:(a,b)=>a.title.localeCompare(b.title),resp:(a,b)=>a.resp.localeCompare(b.resp),prio:(a,b)=>(prioOrder[a.priority]??2)-(prioOrder[b.priority]??2)};
  if (sorters[sortAtividades]) filtered.sort(sorters[sortAtividades]);

  let listHtml = '';
  if (filtered.length>0) {
    const groups = filtered.reduce((acc,at) => { if(!acc[at.date])acc[at.date]=[]; acc[at.date].push(at); return acc; }, {});
    Object.keys(groups).forEach(date => {
      const {label,sub,highlight,past} = formatDateLabel(date);
      listHtml += `<div class="mb-1"><div class="flex items-center gap-3 mb-3 sticky top-0 bg-bg-light dark:bg-bg-dark py-1 z-10">
        <span class="text-[12px] font-extrabold uppercase tracking-widest ${highlight?'text-brand-main':past?'text-red-400':'text-slate-400'}">${label}</span>
        <span class="text-[11px] text-slate-400 font-medium">${sub}</span>
        <div class="flex-1 h-px bg-border-light dark:bg-border-dark"></div>
        <span class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-bold">${groups[date].length}</span>
      </div>
      <div class="space-y-2 mb-6">
        ${groups[date].map(at => {
          const atrasada  = at.status==='pendente'&&at.date<hoje;
          const st        = statusConfig[at.status]||statusConfig.pendente;
          const p         = priorityConfig[at.priority]||priorityConfig.media;
          const isConcluida=at.status==='concluida';
          return `<div class="flex items-center gap-3 p-4 bg-panel-light dark:bg-panel-dark rounded-xl shadow-sm border
            ${isConcluida?'border-emerald-200 dark:border-emerald-900/40 opacity-70':atrasada?'border-red-200 dark:border-red-800/50':'border-border-light dark:border-border-dark'}
            group hover:border-brand-main/40 hover:shadow-md transition-all">
            <button onclick="toggleStatusAtividade(${at.id})"
              class="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
              ${isConcluida?'bg-emerald-500 border-emerald-500 text-white':atrasada?'border-red-400 hover:bg-red-50':'border-slate-300 dark:border-slate-600 hover:border-brand-main'}">
              ${isConcluida?'<i data-lucide="check" class="w-3 h-3"></i>':''}
            </button>
            <div class="w-2 h-2 rounded-full flex-shrink-0 ${p.dot}"></div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-[14px] font-bold ${isConcluida?'line-through text-slate-400':''}">${at.title}</h4>
                ${atrasada?'<span class="text-[9px] font-extrabold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded uppercase">Atrasada</span>':''}
              </div>
              <div class="flex flex-wrap items-center gap-2 mt-1.5">
                <span class="text-[11px] text-slate-400 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i>${at.time}</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${at.color}">${at.tag}</span>
                <span class="text-[11px] text-slate-400 flex items-center gap-1"><i data-lucide="user" class="w-3 h-3"></i>${at.resp}</span>
                ${at.notes?`<span class="text-[11px] text-slate-400 flex items-center gap-1" title="${at.notes}"><i data-lucide="file-text" class="w-3 h-3"></i>Nota</span>`:''}
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <div class="relative group/status hidden sm:block">
                <span class="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer select-none ${st.color}">
                  <i data-lucide="${st.icon}" class="w-3 h-3"></i> ${st.label}</span>
                <div class="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-border-light dark:border-border-dark z-20 w-42 overflow-hidden opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all duration-150">
                  ${Object.entries(statusConfig).map(([key,cfg])=>`<button onclick="setStatusAtividade(${at.id},'${key}')"
                    class="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 ${at.status===key?'text-brand-main font-bold':'text-slate-700 dark:text-slate-200'}">
                    <i data-lucide="${cfg.icon}" class="w-3.5 h-3.5"></i>${cfg.label}</button>`).join('')}
                </div>
              </div>
              <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="openModal('formAtividade',${at.id})" class="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="Editar"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
                <button onclick="deleteAtividade(${at.id})" class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Excluir"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div></div>`;
    });
  } else {
    listHtml=`<div class="text-center py-16 text-slate-400">
      <i data-lucide="inbox" class="w-14 h-14 mx-auto mb-4 opacity-25"></i>
      <p class="text-lg font-semibold">Nenhuma atividade encontrada.</p>
      <button onclick="filterAtividades='Todas'; filterAtividadesMembro='Todos'; filterAtividadesStatus='Todas'; filterAtividadesPrioridade='Todas'; searchAtividades=''; renderApp()"
        class="mt-4 px-5 py-2 rounded-xl bg-brand-main/10 text-brand-main text-sm font-bold hover:bg-brand-main/20">Limpar filtros</button>
    </div>`;
  }

  return `<div class="max-w-4xl mx-auto">${resumoHTML}
    <div class="flex flex-col gap-2 mb-5">
      <div class="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">${filterCatHtml}</div>
      <div class="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">${filterStatusHtml}</div>
      <div class="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">${filterPrioHtml}</div>
    </div>
    <div class="flex items-center gap-3 mb-6 flex-wrap">
      <div class="flex-1 min-w-[180px] relative">
        <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input type="text" placeholder="Buscar atividade..." value="${searchAtividades}"
          oninput="searchAtividades=this.value; renderApp()"
          class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-main">
        ${searchAtividades?`<button onclick="searchAtividades=''; renderApp()" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>`:''}
      </div>
      <div class="flex items-center gap-2"><i data-lucide="users" class="w-4 h-4 text-slate-400"></i>
        <select onchange="filterAtividadesMembro=this.value; renderApp()" class="${selectClass}">${membrosOpts}</select></div>
      <div class="flex items-center gap-2"><i data-lucide="arrow-up-down" class="w-4 h-4 text-slate-400"></i>
        <select onchange="sortAtividades=this.value; renderApp()" class="${selectClass}">${sortOpts}</select></div>
      ${filtered.length>0?`<span class="text-[12px] text-slate-400 font-medium">${filtered.length} resultado${filtered.length!==1?'s':''}</span>`:''}
    </div>${listHtml}</div>`;
}
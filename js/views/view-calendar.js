// =============================================================================
// FAMILYHUB — views/view-calendar.js
// View: Calendário mensal com eventos e filtros
//
// APRESENTAÇÃO:
// Esta view renderiza um calendário mensal clicável. Cada célula exibe
// os eventos daquele dia. Clicar em uma célula vazia abre o modal de
// nova atividade já com a data pré-preenchida. Clicar em um evento
// existente abre o modal de edição.
//
// O calendário suporta filtros por membro e categoria, e os botões
// ◀ ▶ navegam entre os meses via mudaMes().
// =============================================================================
function renderCalendar() {
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // ── Cálculo da grade do calendário ───────────────────────
  // getDay() do primeiro dia indica quantas células vazias preceder o dia 1
  // Ex: se o mês começa na Quarta (3), as células 0,1,2 ficam vazias
  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate(); // Dia 0 do próximo mês = último dia do atual
  const totalCells  = Math.ceil((firstDay + daysInMonth) / 7) * 7; // Sempre múltiplo de 7 (semanas completas)

  let gridHtml = '';

  // Gera cada célula da grade (incluindo as vazias antes/depois do mês)
  for (let i = 0; i < totalCells; i++) {
    const isEmpty = i < firstDay || i >= firstDay + daysInMonth;

    if (isEmpty) {
      // Célula vazia: pertence ao mês anterior ou seguinte
      gridHtml += `<div class="p-2 min-h-[100px] border-b border-r border-border-light dark:border-border-dark bg-slate-50/60 dark:bg-slate-800/20"></div>`;
    } else {
      // Célula com dia do mês atual
      const d       = i - firstDay + 1; // Número do dia (1, 2, 3...)
      const dataStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = new Date().toDateString() === new Date(calYear, calMonth, d).toDateString();

      // Filtra as atividades do dia conforme os filtros ativos
      const dailyActs = DB.atividades.filter(at => {
        if (at.date !== dataStr) return false;
        if (calFilterMembro !== 'Todos' && at.resp !== calFilterMembro) return false;
        if (calFilterCat !== 'Todas' && at.tag !== calFilterCat.toUpperCase()) return false;
        return true;
      });

      // Mostra no máximo 3 eventos por célula — o restante vira "+N mais"
      const actsHtml = dailyActs.slice(0, 3).map(at =>
        `<div class="${at.color} text-[9px] font-bold px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80 ${at.status === 'concluida' ? 'opacity-50 line-through' : ''}"
           title="${at.title}" onclick="openModal('formAtividade',${at.id})">${at.time} ${at.title}</div>`
      ).join('');

      const extra = dailyActs.length > 3
        ? `<div class="text-[9px] text-slate-400 font-bold pl-1">+${dailyActs.length - 3} mais</div>`
        : '';

      gridHtml += `<div class="border-b border-r border-border-light dark:border-border-dark p-1.5 min-h-[100px] flex flex-col overflow-hidden
        ${isToday ? 'bg-brand-main/5' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer group"
        onclick="openModal('formAtividade',null,'${dataStr}')">
        <span class="text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0
          ${isToday ? 'bg-brand-main text-white' : 'text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}">${d}</span>
        <div class="flex-1 overflow-hidden">${actsHtml}${extra}</div></div>`;
    }
  }

  // ── Selects de filtro ────────────────────────────────────
  const selectClass = 'px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium focus:outline-none focus:border-brand-main';
  const membrosOpts = ['Todos', ...DB.membros.map(m => m.name)].map(m => `<option ${calFilterMembro === m ? 'selected' : ''}>${m}</option>`).join('');
  const catOpts     = ['Todas','Tarefa Doméstica','Escola','Esporte','Saúde','Social'].map(c => `<option ${calFilterCat === c ? 'selected' : ''}>${c}</option>`).join('');

  return `<div class="flex flex-col h-full bg-panel-light dark:bg-panel-dark rounded-2xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
    <!-- ── Cabeçalho: navegação e filtros ── -->
    <div class="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/50">
      <div class="flex items-center gap-3">
        <!-- Navegação entre meses -->
        <button onclick="mudaMes(-1)" class="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="chevron-left" class="w-5 h-5"></i></button>
        <h2 class="text-xl font-bold min-w-[180px] text-center text-brand-main">${months[calMonth]} ${calYear}</h2>
        <button onclick="mudaMes(1)" class="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"><i data-lucide="chevron-right" class="w-5 h-5"></i></button>
        <!-- Botão para voltar ao mês atual -->
        <button onclick="calMonth=${new Date().getMonth()}; calYear=${new Date().getFullYear()}; renderApp()"
          class="px-3 py-1.5 text-xs font-bold bg-brand-main/10 text-brand-main rounded-lg hover:bg-brand-main/20">Hoje</button>
      </div>
      <!-- Filtros por membro e categoria -->
      <div class="flex gap-2">
        <select onchange="calFilterMembro=this.value; renderApp()" class="${selectClass}">${membrosOpts}</select>
        <select onchange="calFilterCat=this.value; renderApp()" class="${selectClass}">${catOpts}</select>
      </div>
    </div>
    <!-- ── Cabeçalho dos dias da semana ── -->
    <div class="grid grid-cols-7 border-b border-border-light dark:border-border-dark text-center text-[10px] font-extrabold text-slate-400 py-2 uppercase tracking-widest">
      <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
    </div>
    <!-- ── Grade do calendário ── -->
    <div class="grid grid-cols-7 flex-1 overflow-y-auto">${gridHtml}</div>
  </div>`;
}

// ─── mudaMes() ────────────────────────────────────────────────────────────────
// Avança ou retrocede o calendário em um mês.
// Trata automaticamente a virada de ano (dezembro → janeiro e vice-versa).
// dir: +1 para próximo mês, -1 para mês anterior
function mudaMes(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }  // Dezembro → Janeiro do próximo ano
  if (calMonth < 0)  { calMonth = 11; calYear--; } // Janeiro → Dezembro do ano anterior
  renderApp();
}

// =============================================================================
// FAMILYHUB — views/view-membros.js
// View: Membros da Família
//
// APRESENTAÇÃO:
// Esta view exibe um card para cada membro da família com:
// - Foto de perfil circular com borda colorida personalizada
// - Badge de nível de gamificação (🌱 Iniciante → 👑 Mestre)
// - Pontuação total acumulada
// - Barra de progresso de tarefas (concluídas / total)
// - Quantos eventos tem hoje
//
// O botão "Novo Membro" é sempre o primeiro card da grade.
// Ao hover, aparecem os botões de editar e excluir no canto do card.
// =============================================================================
function renderMembros() {
  const hoje = new Date().toISOString().split('T')[0];

  const cardsHtml = DB.membros.map(m => {
    // ── Calcula estatísticas do membro ──────────────────────
    const atvsTotal  = DB.atividades.filter(a => a.resp === m.name).length;
    const atvsFeitas = DB.atividades.filter(a => a.resp === m.name && a.status === 'concluida').length;
    const atvsHoje   = DB.atividades.filter(a => a.resp === m.name && a.date === hoje).length;
    const pct        = atvsTotal > 0 ? Math.round((atvsFeitas / atvsTotal) * 100) : 0;

    // ── Nível de gamificação ─────────────────────────────────
    const pts   = DB.gamification.pontos[m.name] || 0;
    const level = getLevel(pts); // Retorna o objeto de nível (icon, label, color, bg) de utils.js

    return `<div class="bg-panel-light dark:bg-panel-dark p-6 rounded-2xl shadow-sm border border-border-light dark:border-border-dark flex flex-col items-center border-t-[5px] ${m.border} relative group hover:shadow-md transition-all">

      <!-- ── Botões de ação (visíveis ao hover) ── -->
      <div class="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onclick="openModal('formMembro',${m.id})" class="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-slate-500 hover:text-blue-500">
          <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
        </button>
        <button onclick="deleteMembro(${m.id})" class="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg text-slate-500 hover:text-red-500">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>

      <!-- ── Foto de perfil com badge de nível ── -->
      <div class="relative">
        <!-- Borda colorida personalizada do membro -->
        <div class="w-20 h-20 rounded-full p-0.5 border-2 mb-4" style="border-color:${m.borderHex || '#3b82f6'}">
          <img src="${m.photo || `https://ui-avatars.com/api/?name=${m.name}&background=random`}" class="w-full h-full rounded-full object-cover">
        </div>
        <!-- Badge de nível no canto inferior direito da foto -->
        <div class="absolute -bottom-1 -right-1 w-7 h-7 rounded-full ${level.bg} flex items-center justify-center text-sm border-2 border-white dark:border-slate-900" title="${level.label}">
          ${level.icon}
        </div>
      </div>

      <!-- ── Nome e parentesco ── -->
      <h3 class="text-lg font-bold">${m.name}</h3>
      <p class="text-[10px] font-extrabold uppercase tracking-widest mt-0.5" style="color:${m.borderHex || '#3b82f6'}">${m.role}</p>

      <!-- ── Nível e pontuação ── -->
      <div class="flex items-center gap-2 mt-2">
        <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${level.bg} ${level.color}">${level.label}</span>
        <span class="text-[11px] font-bold text-amber-500">${pts} pts</span>
      </div>

      <!-- ── Barra de progresso de tarefas ── -->
      <div class="w-full mt-4 space-y-2">
        <div class="flex justify-between text-[11px] text-slate-500 font-medium">
          <span>${atvsFeitas} de ${atvsTotal} tarefas</span>
          <span class="font-bold">${pct}%</span>
        </div>
        <!-- Barra colorida com a cor do membro -->
        <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500" style="width:${pct}%; background-color:${m.borderHex || '#3b82f6'}"></div>
        </div>
        <!-- Contador de eventos de hoje (só aparece quando há) -->
        ${atvsHoje > 0
          ? `<p class="text-[11px] text-center text-slate-400 font-medium">${atvsHoje} evento${atvsHoje > 1 ? 's' : ''} hoje</p>`
          : ''}
      </div>
    </div>`;
  }).join('');

  // Grade com o botão "Novo Membro" sempre primeiro
  return `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    <!-- Botão de adicionar novo membro — sempre o primeiro card -->
    <button onclick="openModal('formMembro')"
      class="bg-transparent border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-500 hover:text-brand-main hover:border-brand-main hover:bg-brand-main/5 min-h-[260px] transition-all group">
      <div class="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-main/10 flex items-center justify-center mb-3">
        <i data-lucide="user-plus" class="w-7 h-7"></i>
      </div>
      <h3 class="font-bold text-base">Novo Membro</h3>
      <p class="text-xs mt-1 text-center opacity-60">Adicione alguém à tribo</p>
    </button>
    ${cardsHtml}
  </div>`;
}
